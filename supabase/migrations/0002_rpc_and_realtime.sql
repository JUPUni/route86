-- Route 86 · privileged operations as SECURITY DEFINER functions + realtime broadcast trigger.
-- With these, the app needs only the public URL + anon key: no service-role secret anywhere.

-- ---------- realtime: broadcast every order change to the customer's topic and the store topic ----------
create or replace function public.orders_broadcast()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  payload jsonb;
begin
  payload := jsonb_build_object(
    'id', new.id,
    'order_number', new.order_number,
    'status', new.status,
    'fulfillment_type', new.fulfillment_type,
    'eta_minutes', new.eta_minutes,
    'cancel_reason', new.cancel_reason,
    'updated_at', new.updated_at
  );
  begin
    perform realtime.send(payload, 'status', 'order:' || new.id::text, false);
    perform realtime.send(payload, case when tg_op = 'INSERT' then 'new' else 'status' end, 'store:orders', false);
  exception when others then
    -- never let a realtime hiccup break an order
    null;
  end;
  return new;
end $$;

drop trigger if exists orders_broadcast_trg on public.orders;
create trigger orders_broadcast_trg
  after insert or update of status, eta_minutes, cancel_reason on public.orders
  for each row execute function public.orders_broadcast();

-- ---------- create_order: re-prices everything server-side from menu_items + settings ----------
create or replace function public.create_order(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.settings%rowtype;
  item jsonb;
  mi public.menu_items%rowtype;
  sel jsonb;
  grp jsonb;
  choice jsonb;
  unit int;
  qty int;
  subtotal int := 0;
  fee int := 0;
  tax int := 0;
  fulfillment text := p->>'fulfillment_type';
  new_order public.orders%rowtype;
  lines jsonb := '[]'::jsonb;
  line_sels jsonb;
  required_ok boolean;
begin
  select * into s from public.settings where id = 1;
  if s.id is null then raise exception 'Store settings missing'; end if;
  if not (s.store_open and s.accepting_orders) then raise exception 'ORDERS_PAUSED'; end if;
  if fulfillment not in ('pickup','delivery') then raise exception 'Invalid fulfillment type'; end if;
  if fulfillment = 'delivery' and not s.delivery_enabled then raise exception 'DELIVERY_OFF'; end if;
  if fulfillment = 'pickup' and not s.pickup_enabled then raise exception 'PICKUP_OFF'; end if;
  if jsonb_array_length(coalesce(p->'items', '[]'::jsonb)) = 0 then raise exception 'EMPTY_CART'; end if;

  -- price each line
  for item in select * from jsonb_array_elements(p->'items') loop
    select * into mi from public.menu_items where id = item->>'menu_item_id';
    if mi.id is null or not mi.available then raise exception 'ITEM_UNAVAILABLE:%', coalesce(mi.name, item->>'menu_item_id'); end if;
    qty := greatest(1, least(50, coalesce((item->>'quantity')::int, 1)));
    unit := mi.price_cents;
    line_sels := '[]'::jsonb;
    for sel in select * from jsonb_array_elements(coalesce(item->'selections', '[]'::jsonb)) loop
      select g into grp from jsonb_array_elements(mi.options) g where g->>'id' = sel->>'groupId';
      if grp is null then raise exception 'BAD_OPTION:%', mi.name; end if;
      select c into choice from jsonb_array_elements(grp->'choices') c where c->>'id' = sel->>'choiceId';
      if choice is null then raise exception 'BAD_OPTION:%', mi.name; end if;
      unit := unit + coalesce((choice->>'priceDeltaCents')::int, 0);
      line_sels := line_sels || jsonb_build_object(
        'groupId', grp->>'id', 'groupName', grp->>'name',
        'choiceId', choice->>'id', 'choiceName', choice->>'name',
        'priceDeltaCents', coalesce((choice->>'priceDeltaCents')::int, 0));
    end loop;
    -- required groups
    for grp in select * from jsonb_array_elements(mi.options) loop
      if coalesce((grp->>'required')::boolean, false) then
        select exists(select 1 from jsonb_array_elements(line_sels) x where x->>'groupId' = grp->>'id') into required_ok;
        if not required_ok then raise exception 'MISSING_OPTION:%:%', mi.name, grp->>'name'; end if;
      end if;
    end loop;
    subtotal := subtotal + unit * qty;
    lines := lines || jsonb_build_object(
      'menu_item_id', mi.id, 'name', mi.name, 'quantity', qty,
      'unit_price_cents', unit, 'line_total_cents', unit * qty,
      'selections', line_sels, 'notes', nullif(item->>'notes', ''));
  end loop;

  if fulfillment = 'delivery' then
    if subtotal < s.delivery_minimum_cents then raise exception 'BELOW_MINIMUM:%', s.delivery_minimum_cents; end if;
    fee := s.delivery_fee_cents;
  end if;
  tax := round((subtotal + fee) * s.tax_rate);

  insert into public.orders (
    fulfillment_type, payment_method, customer_name, customer_phone, customer_email, delivery_address, notes,
    notify_whatsapp, notify_email, subtotal_cents, delivery_fee_cents, tax_cents, total_cents, eta_minutes, source
  ) values (
    fulfillment,
    coalesce(p->>'payment_method', 'pay_at_pickup'),
    left(p->>'customer_name', 80),
    p->>'customer_phone',
    nullif(left(p->>'customer_email', 120), ''),
    case when fulfillment = 'delivery' then nullif(left(p->>'delivery_address', 300), '') else null end,
    nullif(left(p->>'notes', 500), ''),
    coalesce((p->>'notify_whatsapp')::boolean, true),
    coalesce((p->>'notify_email')::boolean, true) and nullif(p->>'customer_email', '') is not null,
    subtotal, fee, tax, subtotal + fee + tax,
    s.prep_time_minutes + case when fulfillment = 'delivery' then 15 else 0 end,
    coalesce(p->>'source', 'web')
  ) returning * into new_order;

  insert into public.order_items (order_id, menu_item_id, name, quantity, unit_price_cents, line_total_cents, selections, notes)
  select new_order.id, l->>'menu_item_id', l->>'name', (l->>'quantity')::int, (l->>'unit_price_cents')::int,
         (l->>'line_total_cents')::int, l->'selections', l->>'notes'
  from jsonb_array_elements(lines) l;

  return public.order_json(new_order.id);
end $$;

-- full order + items as json (used by create_order; not exposed to anon directly)
create or replace function public.order_json(p_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select to_jsonb(o) || jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(i) order by i.name) from public.order_items i where i.order_id = o.id), '[]'::jsonb)
  )
  from public.orders o where o.id = p_id;
$$;
revoke all on function public.order_json(uuid) from public, anon, authenticated;

-- ---------- get_public_order: limited view for the customer's tracking page (UUID is the credential) ----------
create or replace function public.get_public_order(p_id uuid)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'id', o.id,
    'order_number', o.order_number,
    'status', o.status,
    'fulfillment_type', o.fulfillment_type,
    'customer_name', split_part(o.customer_name, ' ', 1),
    'eta_minutes', o.eta_minutes,
    'cancel_reason', o.cancel_reason,
    'subtotal_cents', o.subtotal_cents,
    'delivery_fee_cents', o.delivery_fee_cents,
    'tax_cents', o.tax_cents,
    'total_cents', o.total_cents,
    'created_at', o.created_at,
    'ready_at', o.ready_at,
    'completed_at', o.completed_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'name', i.name, 'quantity', i.quantity, 'line_total_cents', i.line_total_cents, 'selections', i.selections) order by i.name)
      from public.order_items i where i.order_id = o.id), '[]'::jsonb)
  )
  from public.orders o where o.id = p_id;
$$;

-- ---------- log_notification: the app server records every WhatsApp/email attempt ----------
create or replace function public.log_notification(
  p_order_id uuid, p_channel text, p_event text, p_recipient text, p_provider text, p_provider_id text, p_status text, p_error text
) returns void
language sql
security definer
set search_path = public
as $$
  insert into public.notifications (order_id, channel, event, recipient, provider, provider_id, status, error)
  select p_order_id, p_channel, p_event, p_recipient, p_provider, p_provider_id, p_status, p_error
  where exists (select 1 from public.orders where id = p_order_id);
$$;

grant execute on function public.create_order(jsonb) to anon, authenticated;
grant execute on function public.get_public_order(uuid) to anon, authenticated;
grant execute on function public.log_notification(uuid, text, text, text, text, text, text, text) to anon, authenticated;

-- ---------- staff also need to insert nothing directly; but they update orders and read everything ----------
-- (policies from 0001 already cover select/update for staff)
