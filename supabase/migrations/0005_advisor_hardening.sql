-- Findings from the Supabase security advisor after 0003/0004.
alter table public.rate_limits enable row level security;  -- no policies: only SECURITY DEFINER functions touch it

create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Trigger functions must not be callable through the REST RPC surface.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.orders_audit() from public, anon, authenticated;
revoke execute on function public.orders_broadcast() from public, anon, authenticated;
revoke execute on function public.orders_schedule_reminders() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;

-- Anonymous callers have no use for these.
revoke execute on function public.my_orders(int) from anon;
revoke execute on function public.unregister_push_subscription(text) from public;
