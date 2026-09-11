-- Route 86 v2 · customer accounts (Google sign-in), web push, reminders, audit trail,
-- rate limiting, idempotency, and secret-gated server functions.
-- The app server holds only the anon key. Privileged server-side reads/writes go through
-- SECURITY DEFINER functions that require the shared secret stored in private.config
-- (key 'server_secret'; see 0004_private_server_config.sql). The same value is SERVER_SECRET in the app env.

-- ---------- helpers ----------
create or replace function public.check_server_secret(p_secret text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_secret is null or p_secret <> coalesce(current_setting('app.server_secret', true), '') then
    raise exception 'SERVER_SECRET_INVALID';
  end if;
end $$;
revoke all on function public.check_server_secret(text) from public, anon, authenticated;

-- ---------- customer profiles (auto-created from auth.users; Google sign-in fills name/avatar) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  avatar_url text,
  default_fulfillment text check (default_fulfillment in ('pickup','delivery')),
  delivery_address text,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles for all to authenticated using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists "staff read profiles" on public.profiles;
create policy "staff read profiles" on public.profiles for select to authenticated using (public.is_staff());
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update set email = excluded.email, updated_at = now();
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
-- backfill existing users
insert into public.profiles (id, email, full_name)
select id, email, coalesce(raw_user_meta_data ->> 'full_name', raw_user_meta_data ->> 'name') from auth.users
on conflict (id) do nothing;

-- ---------- orders: owner, idempotency ----------
alter table public.orders add column if not exists customer_id uuid references auth.users(id) on delete set null;
alter table public.orders add column if not exists idempotency_key text;
create unique index if not exists orders_idempotency_idx on public.orders(idempotency_key) where idempotency_key is not null;
create index if not exists orders_customer_idx on public.orders(customer_id, created_at desc);

drop policy if exists "customer read own orders" on public.orders;
create policy "customer read own orders" on public.orders for select to authenticated using (customer_id = auth.uid());
drop policy if exists "customer read own order_items" on public.order_items;
create policy "customer read own order_items" on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_items.order_id and o.customer_id = auth.uid()));

-- ---------- audit trail ----------
create table if not exists public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  actor text not null check (actor in ('customer','staff','system')),
  actor_email text,
  from_status text,
  to_status text,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists order_events_order_idx on public.order_events(order_id, created_at);
alter table public.order_events enable row level security;
drop policy if exists "staff read order_events" on public.order_events;
create policy "staff read order_events" on public.order_events for select to authenticated using (public.is_staff());
drop policy if exists "customer read own order_events" on public.order_events;
create policy "customer read own order_events" on public.order_events for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_events.order_id and o.customer_id = auth.uid()));

create or replace function public.orders_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_events (order_id, actor, actor_email, from_status, to_status, note)
    values (new.id, case when new.customer_id is null then 'system' else 'customer' end, null, null, new.status, 'Order placed');
  elsif new.status is distinct from old.status then
    insert into public.order_events (order_id, actor, actor_email, from_status, to_status, note)
    values (new.id, case when auth.uid() is null then 'system' else 'staff' end, auth.jwt() ->> 'email', old.status, new.status, new.cancel_reason);
  end if;
  return new;
end $$;
drop trigger if exists orders_audit_trg on public.orders;
create trigger orders_audit_trg after insert or update of status on public.orders for each row execute function public.orders_audit();

-- ---------- web push subscriptions ----------
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('customer','staff')),
  user_id uuid references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  disabled_at timestamptz
);
create index if not exists push_subs_order_idx on public.push_subscriptions(order_id) where disabled_at is null;
create index if not exists push_subs_user_idx on public.push_subscriptions(user_id) where disabled_at is null;
create index if not exists push_subs_audience_idx on public.push_subscriptions(audience) where disabled_at is null;
alter table public.push_subscriptions enable row level security;
drop policy if exists "own push subs" on public.push_subscriptions;
create policy "own push subs" on public.push_subscriptions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Anyone may register a subscription for a specific order (the UUID is the credential) or, when signed in,
-- for their account. Staff audience requires is_staff().
create or replace function public.register_push_subscription(p_audience text, p_order_id uuid, p_endpoint text, p_p256dh text, p_auth text, p_user_agent text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  sid uuid;
  uid uuid := auth.uid();
begin
  if p_audience = 'staff' and not public.is_staff() then raise exception 'NOT_STAFF'; end if;
  if p_audience = 'customer' and uid is null and p_order_id is null then raise exception 'ORDER_OR_LOGIN_REQUIRED'; end if;
  if p_order_id is not null and not exists (select 1 from public.orders where id = p_order_id) then raise exception 'ORDER_NOT_FOUND'; end if;
  insert into public.push_subscriptions (audience, user_id, order_id, endpoint, p256dh, auth, user_agent)
  values (p_audience, uid, p_order_id, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update set
    audience = excluded.audience,
    user_id = coalesce(excluded.user_id, public.push_subscriptions.user_id),
    order_id = coalesce(excluded.order_id, public.push_subscriptions.order_id),
    p256dh = excluded.p256dh, auth = excluded.auth, user_agent = excluded.user_agent,
    last_seen_at = now(), disabled_at = null
  returning id into sid;
  return sid;
end $$;
grant execute on function public.register_push_subscription(text, uuid, text, text, text, text) to anon, authenticated;

create or replace function public.unregister_push_subscription(p_endpoint text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.push_subscriptions set disabled_at = now() where endpoint = p_endpoint;
$$;
grant execute on function public.unregister_push_subscription(text) to anon, authenticated;

-- Server: fetch push targets. audience 'staff' → all staff subs; 'customer' → subs for the order or its owner.
create or replace function public.get_push_targets(p_secret text, p_audience text, p_order_id uuid)
returns table (id uuid, endpoint text, p256dh text, auth text)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.check_server_secret(p_secret);
  if p_audience = 'staff' then
    return query select s.id, s.endpoint, s.p256dh, s.auth from public.push_subscriptions s
      where s.audience = 'staff' and s.disabled_at is null;
  else
    return query select s.id, s.endpoint, s.p256dh, s.auth from public.push_subscriptions s
      where s.audience = 'customer' and s.disabled_at is null
        and (s.order_id = p_order_id or (s.user_id is not null and s.user_id = (select o.customer_id from public.orders o where o.id = p_order_id)));
  end if;
end $$;
grant execute on function public.get_push_targets(text, text, uuid) to anon, authenticated;

create or replace function public.disable_push_subscription(p_secret text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.check_server_secret(p_secret);
  update public.push_subscriptions set disabled_at = now() where id = p_id;
end $$;
grant execute on function public.disable_push_subscription(text, uuid) to anon, authenticated;

-- ---------- notifications: add push channel + provider status updates (webhooks) ----------
alter table public.notifications drop constraint if exists notifications_channel_check;
alter table public.notifications add constraint notifications_channel_check check (channel in ('whatsapp','email','push'));
alter table public.notifications drop constraint if exists notifications_status_check;
alter table public.notifications add constraint notifications_status_check check (status in ('sent','failed','skipped','delivered','bounced','opened'));
create index if not exists notifications_provider_idx on public.notifications(provider_id) where provider_id is not null;

create or replace function public.update_notification_status(p_secret text, p_provider_id text, p_status text, p_error text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.check_server_secret(p_secret);
  update public.notifications set status = p_status, error = coalesce(p_error, error) where provider_id = p_provider_id;
end $$;
grant execute on function public.update_notification_status(text, text, text, text) to anon, authenticated;

-- ---------- reminders (scheduled nudges for both sides) ----------
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  kind text not null check (kind in ('staff_unaccepted','staff_stale_preparing','customer_pickup_waiting','customer_feedback')),
  due_at timestamptz not null,
  sent_at timestamptz,
  cancelled_at timestamptz,
  attempts int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists reminders_due_idx on public.reminders(due_at) where sent_at is null and cancelled_at is null;
create unique index if not exists reminders_order_kind_active_idx on public.reminders(order_id, kind) where sent_at is null and cancelled_at is null;
alter table public.reminders enable row level security;
drop policy if exists "staff read reminders" on public.reminders;
create policy "staff read reminders" on public.reminders for select to authenticated using (public.is_staff());

-- Schedule/cancel reminders as orders move. Timings are configurable in settings (see below).
alter table public.settings add column if not exists remind_staff_unaccepted_minutes int not null default 3;
alter table public.settings add column if not exists remind_staff_stale_minutes int not null default 10;
alter table public.settings add column if not exists remind_customer_pickup_minutes int not null default 15;
alter table public.settings add column if not exists remind_customer_feedback_hours int not null default 3;

create or replace function public.orders_schedule_reminders()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare s public.settings%rowtype;
begin
  select * into s from public.settings where id = 1;
  -- any status change cancels pending reminders for the order
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    update public.reminders set cancelled_at = now() where order_id = new.id and sent_at is null and cancelled_at is null;
  end if;
  if new.status = 'received' then
    insert into public.reminders (order_id, kind, due_at) values (new.id, 'staff_unaccepted', now() + make_interval(mins => s.remind_staff_unaccepted_minutes)) on conflict do nothing;
  elsif new.status = 'preparing' then
    insert into public.reminders (order_id, kind, due_at) values (new.id, 'staff_stale_preparing', now() + make_interval(mins => coalesce(new.eta_minutes, s.prep_time_minutes) + s.remind_staff_stale_minutes)) on conflict do nothing;
  elsif new.status = 'ready' and new.fulfillment_type = 'pickup' then
    insert into public.reminders (order_id, kind, due_at) values (new.id, 'customer_pickup_waiting', now() + make_interval(mins => s.remind_customer_pickup_minutes)) on conflict do nothing;
  elsif new.status = 'completed' then
    insert into public.reminders (order_id, kind, due_at) values (new.id, 'customer_feedback', now() + make_interval(hours => s.remind_customer_feedback_hours)) on conflict do nothing;
  end if;
  return new;
end $$;
drop trigger if exists orders_schedule_reminders_trg on public.orders;
create trigger orders_schedule_reminders_trg after insert or update of status on public.orders for each row execute function public.orders_schedule_reminders();

-- Server (cron): claim due reminders. Returns the reminder with its order json; marks attempts.
create or replace function public.claim_due_reminders(p_secret text, p_limit int default 50)
returns table (reminder_id uuid, kind text, order_json jsonb)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.check_server_secret(p_secret);
  return query
    with due as (
      select r.id from public.reminders r
      where r.sent_at is null and r.cancelled_at is null and r.due_at <= now() and r.attempts < 3
      order by r.due_at limit p_limit
      for update skip locked
    ), claimed as (
      update public.reminders r set attempts = r.attempts + 1 from due where r.id = due.id
      returning r.id, r.kind, r.order_id
    )
    select c.id, c.kind, public.order_json(c.order_id) from claimed c;
end $$;
grant execute on function public.claim_due_reminders(text, int) to anon, authenticated;

create or replace function public.mark_reminder_sent(p_secret text, p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.check_server_secret(p_secret);
  update public.reminders set sent_at = now() where id = p_id;
end $$;
grant execute on function public.mark_reminder_sent(text, uuid) to anon, authenticated;

-- ---------- rate limiting (fixed window) ----------
create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 0,
  primary key (key, window_start)
);
create or replace function public.check_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare ws timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
        c int;
begin
  insert into public.rate_limits (key, window_start, count) values (p_key, ws, 1)
  on conflict (key, window_start) do update set count = public.rate_limits.count + 1
  returning count into c;
  delete from public.rate_limits where window_start < now() - interval '1 day';
  return c <= p_limit;
end $$;
revoke all on function public.check_rate_limit(text, int, int) from public, anon, authenticated;

-- ---------- create_order v2: owner, idempotency, rate limit ----------
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
  existing uuid;
  idem text := nullif(p->>'idempotency_key', '');
  ip text := coalesce(nullif(p->>'client_ip', ''), 'unknown');
begin
  if idem is not null then
    select id into existing from public.orders where idempotency_key = idem;
    if existing is not null then return public.order_json(existing); end if;
  end if;
  if not public.check_rate_limit('order:ip:' || ip, 10, 600) then raise exception 'RATE_LIMITED'; end if;
  if not public.check_rate_limit('order:phone:' || coalesce(p->>'customer_phone', ''), 6, 3600) then raise exception 'RATE_LIMITED'; end if;

  select * into s from public.settings where id = 1;
  if s.id is null then raise exception 'Store settings missing'; end if;
  if not (s.store_open and s.accepting_orders) then raise exception 'ORDERS_PAUSED'; end if;
  if fulfillment not in ('pickup','delivery') then raise exception 'Invalid fulfillment type'; end if;
  if fulfillment = 'delivery' and not s.delivery_enabled then raise exception 'DELIVERY_OFF'; end if;
  if fulfillment = 'pickup' and not s.pickup_enabled then raise exception 'PICKUP_OFF'; end if;
  if jsonb_array_length(coalesce(p->'items', '[]'::jsonb)) = 0 then raise exception 'EMPTY_CART'; end if;

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
    notify_whatsapp, notify_email, subtotal_cents, delivery_fee_cents, tax_cents, total_cents, eta_minutes, source,
    customer_id, idempotency_key
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
    coalesce(p->>'source', 'web'),
    auth.uid(),
    idem
  ) returning * into new_order;

  insert into public.order_items (order_id, menu_item_id, name, quantity, unit_price_cents, line_total_cents, selections, notes)
  select new_order.id, l->>'menu_item_id', l->>'name', (l->>'quantity')::int, (l->>'unit_price_cents')::int,
         (l->>'line_total_cents')::int, l->'selections', l->>'notes'
  from jsonb_array_elements(lines) l;

  -- remember details on the customer's profile
  if auth.uid() is not null then
    update public.profiles set phone = coalesce(phone, new_order.customer_phone),
      default_fulfillment = new_order.fulfillment_type,
      delivery_address = coalesce(new_order.delivery_address, delivery_address),
      updated_at = now()
    where id = auth.uid();
  end if;

  return public.order_json(new_order.id);
end $$;

-- ---------- server-side full order read (for cron / webhooks) ----------
create or replace function public.get_order_for_server(p_secret text, p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.check_server_secret(p_secret);
  return public.order_json(p_id);
end $$;
grant execute on function public.get_order_for_server(text, uuid) to anon, authenticated;

-- ---------- customer: my recent orders (RLS already allows; convenience view with items) ----------
create or replace function public.my_orders(p_limit int default 20)
returns setof jsonb
language sql
security definer
set search_path = public
stable
as $$
  select public.order_json(o.id) from public.orders o
  where o.customer_id = auth.uid()
  order by o.created_at desc limit p_limit;
$$;
grant execute on function public.my_orders(int) to authenticated;
