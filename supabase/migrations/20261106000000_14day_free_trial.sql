-- =====================================================================
-- Migration: 20261106000000_14day_free_trial.sql
--
-- Changes:
--   1. Insert a "7-Day Free Trial" subscription plan (₹0, 7 days).
--   2. Update the handle_new_user trigger to activate the 7-day free
--      trial (instead of the old 1-month trial) for every new signup.
--
-- The existing "Free Trial" plan (1 month) is deactivated so it no
-- longer appears in the active plans list, but historical subscriptions
-- that reference it are preserved.
-- =====================================================================

-- 1. Deactivate the old 1-month Free Trial plan (preserve existing rows)
update public.subscription_plans
set is_active = false
where name = 'Free Trial'
  and billing_interval = 'FREE_TRIAL';

-- 2. Insert the new 7-Day Free Trial plan
insert into public.subscription_plans (name, description, price, currency, billing_interval, is_active)
values (
  '7-Day Free Trial',
  '7-day free access granted automatically on signup. Full platform access, no credit card required.',
  0,
  'INR',
  'FREE_TRIAL',
  true
)
on conflict do nothing;

-- 3. Update handle_new_user trigger to use the 7-Day Free Trial plan
--    and store the trial for exactly 7 days.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role_id uuid;
  v_plan_id uuid;
begin
  -- Create profile row
  insert into public.profiles (id, email, phone, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.phone, new.raw_user_meta_data->>'phone'),
    new.raw_user_meta_data->>'full_name'
  );

  -- Assign default 'user' role
  select id into v_role_id from public.roles where name = 'user';
  insert into public.user_roles (user_id, role_id) values (new.id, v_role_id)
  on conflict do nothing;

  -- Activate 7-day free trial subscription
  select id into v_plan_id
  from public.subscription_plans
  where name = '7-Day Free Trial'
    and is_active = true
  limit 1;

  insert into public.user_subscriptions (user_id, plan_id, status, started_at, expires_at)
  values (new.id, v_plan_id, 'ACTIVE', now(), now() + interval '7 days');

  return new;
end;
$$;

-- Re-create the trigger (drop-if-exists ensures idempotency)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
