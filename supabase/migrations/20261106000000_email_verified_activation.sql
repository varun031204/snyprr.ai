-- ============================================================
-- Migration: Activate profile only after email verification
--
-- Changes handle_new_user trigger to set account_status =
-- 'PENDING_VERIFICATION' initially.
-- A new trigger on auth.users fires when email_confirmed_at is
-- set, activating the profile and starting the free trial.
-- ============================================================

-- 1. Update handle_new_user to create PENDING profile (no trial yet)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role_id uuid;
BEGIN
  -- Create profile as PENDING — no trial, no role until email verified
  INSERT INTO public.profiles (id, email, phone, full_name, account_status)
  VALUES (
    new.id,
    new.email,
    public.normalize_phone(coalesce(new.raw_user_meta_data->>'phone', '')),
    new.raw_user_meta_data->>'full_name',
    'PENDING_VERIFICATION'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Assign user role immediately (needed so the JWT claims work)
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'user';
  INSERT INTO public.user_roles (user_id, role_id) VALUES (new.id, v_role_id)
  ON CONFLICT DO NOTHING;

  RETURN new;
END;
$$;

-- 2. New trigger: fires when email_confirmed_at is populated
CREATE OR REPLACE FUNCTION public.handle_email_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
BEGIN
  -- Only act when email_confirmed_at just changed from NULL to a value
  IF (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL) THEN

    -- Activate the profile
    UPDATE public.profiles
    SET account_status = 'ACTIVE', updated_at = now()
    WHERE id = NEW.id AND account_status = 'PENDING_VERIFICATION';

    -- Start 15-day free trial (matches existing subscription logic)
    SELECT id INTO v_plan_id FROM public.subscription_plans WHERE name = 'Free Trial';
    IF v_plan_id IS NOT NULL THEN
      INSERT INTO public.user_subscriptions (user_id, plan_id, status, started_at, expires_at)
      VALUES (NEW.id, v_plan_id, 'ACTIVE', now(), now() + interval '15 days')
      ON CONFLICT DO NOTHING;
    END IF;

  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_email_confirmed ON auth.users;
CREATE TRIGGER on_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_email_verified();

COMMENT ON FUNCTION public.handle_email_verified IS
  'Activates profile and starts free trial only after email OTP is verified';
