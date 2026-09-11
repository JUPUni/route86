-- Route 86 ordering platform · initial schema
-- Run with: supabase db push   (or paste into the Supabase SQL editor)

create extension if not exists "pgcrypto";

-- ---------- staff allow-list ----------
create table if not exists public.staff (
  email text primary key,
  name text,
  role text not null default 'staff' check (role in ('owner','manager','staff')),
  created_at timestamptz not null default now()
);

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.staff s
    where lower(s.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------- menu ----------
create table if not exists public.menu_categories (
  id text primary key default gen_random_uuid()::text,
  slug text unique not null,
  name text not null,
  tagline text,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.menu_items (
  id text primary key default gen_random_uuid()::text,
  category_id text not null references public.menu_categories(id) on delete cascade,
  slug text unique not null,
  name text not null,
  description text,
  price_cents int not null check (price_cents >= 0),
  image_url text,
  tags text[] not null default '{}',
  options jsonb not null default '[]'::jsonb,
  available boolean not null default true,   -- false = "86'd"
  featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists menu_items_category_idx on public.menu_items(category_id, sort_order);

-- ---------- store settings (singleton row id = 1) ----------
create table if not exists public.settings (
  id int primary key check (id = 1),
  store_open boolean not null default true,
  accepting_orders boolean not null default true,
  pickup_enabled boolean not null default true,
  delivery_enabled boolean not null default true,
  delivery_fee_cents int not null default 500,
  delivery_minimum_cents int not null default 2000,
  tax_rate numeric(5,4) not null default 0,
  prep_time_minutes int not null default 25,
  announcement text,
  hours jsonb not null default '[]'::jsonb,
  store_whatsapp text,
  store_email text,
  currency text not null default 'USD',
  updated_at timestamptz not null default now()
);

-- ---------- orders ----------
create sequence if not exists public.order_number_seq start 1001;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('R86-' || nextval('public.order_number_seq')::text),
  status text not null default 'received'
    check (status in ('received','preparing','ready','out_for_delivery','completed','cancelled')),
  fulfillment_type text not null check (fulfillment_type in ('pickup','delivery')),
  payment_method text not null default 'pay_at_pickup'
    check (payment_method in ('pay_at_pickup','cash_on_delivery','card_on_delivery')),
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  delivery_address text,
  notes text,
  notify_whatsapp boolean not null default true,
  notify_email boolean not null default true,
  subtotal_cents int not null,
  delivery_fee_cents int not null default 0,
  tax_cents int not null default 0,
  total_cents int not null,
  eta_minutes int,
  cancel_reason text,
  source text not null default 'web',
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists orders_status_created_idx on public.orders(status, created_at desc);
create index if not exists orders_created_idx on public.orders(created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  menu_item_id text references public.menu_items(id) on delete set null,
  name text not null,
  quantity int not null check (quantity > 0),
  unit_price_cents int not null,
  line_total_cents int not null,
  selections jsonb not null default '[]'::jsonb,
  notes text
);
create index if not exists order_items_order_idx on public.order_items(order_id);

-- ---------- notification log ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete cascade,
  channel text not null check (channel in ('whatsapp','email')),
  event text not null,
  recipient text not null,
  provider text not null,
  provider_id text,
  status text not null check (status in ('sent','failed','skipped')),
  error text,
  created_at timestamptz not null default now()
);
create index if not exists notifications_order_idx on public.notifications(order_id, created_at desc);

-- ---------- updated_at trigger ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();
drop trigger if exists menu_items_touch on public.menu_items;
create trigger menu_items_touch before update on public.menu_items
  for each row execute function public.touch_updated_at();

-- ---------- realtime ----------
-- Staff dashboard listens to postgres_changes on orders (RLS enforced by is_staff()).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
alter table public.orders replica identity full;

-- ---------- row level security ----------
alter table public.staff enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.notifications enable row level security;

-- staff: only staff can see the list
drop policy if exists "staff read staff" on public.staff;
create policy "staff read staff" on public.staff for select to authenticated using (public.is_staff());

-- menu: anyone can read active menu; staff can write
drop policy if exists "public read categories" on public.menu_categories;
create policy "public read categories" on public.menu_categories for select using (active or public.is_staff());
drop policy if exists "staff write categories" on public.menu_categories;
create policy "staff write categories" on public.menu_categories for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "public read items" on public.menu_items;
create policy "public read items" on public.menu_items for select using (true);
drop policy if exists "staff write items" on public.menu_items;
create policy "staff write items" on public.menu_items for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- settings: public read (open/closed, fees), staff write
drop policy if exists "public read settings" on public.settings;
create policy "public read settings" on public.settings for select using (true);
drop policy if exists "staff write settings" on public.settings;
create policy "staff write settings" on public.settings for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- orders: staff only. Customers create orders through the server (service role) and
-- track them through /api/orders/[id] which exposes a limited view.
drop policy if exists "staff read orders" on public.orders;
create policy "staff read orders" on public.orders for select to authenticated using (public.is_staff());
drop policy if exists "staff update orders" on public.orders;
create policy "staff update orders" on public.orders for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists "staff read order_items" on public.order_items;
create policy "staff read order_items" on public.order_items for select to authenticated using (public.is_staff());

drop policy if exists "staff read notifications" on public.notifications;
create policy "staff read notifications" on public.notifications for select to authenticated using (public.is_staff());

-- default settings row
insert into public.settings (id, hours, store_whatsapp, store_email)
values (
  1,
  '[{"day":"Mon","open":"11:00","close":"22:00"},{"day":"Tue","open":"11:00","close":"22:00"},{"day":"Wed","open":"11:00","close":"22:00"},{"day":"Thu","open":"11:00","close":"22:00"},{"day":"Fri","open":"11:00","close":"23:00"},{"day":"Sat","open":"11:00","close":"23:00"},{"day":"Sun","open":"12:00","close":"21:00"}]'::jsonb,
  '+12642358686',
  null
)
on conflict (id) do nothing;
