-- Server secret lives in a private schema table (ALTER DATABASE SET is not permitted on Supabase).
-- Set the value once (never commit it):
--   insert into private.config (key, value) values ('server_secret', '<same value as SERVER_SECRET env>')
--   on conflict (key) do update set value = excluded.value, updated_at = now();
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table if not exists private.config (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
revoke all on private.config from public, anon, authenticated;

create or replace function public.check_server_secret(p_secret text)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare expected text;
begin
  select value into expected from private.config where key = 'server_secret';
  if p_secret is null or expected is null or p_secret <> expected then
    raise exception 'SERVER_SECRET_INVALID';
  end if;
end $$;
revoke all on function public.check_server_secret(text) from public, anon, authenticated;
