-- ============================================================
-- Migration: Change free trial from 7 days to 15 days
--
-- 1. Rename the subscription plan from "7-Day Free Trial" to "15-Day Free Trial"
-- 2. Update the handle_email_verified trigger to set 15-day expiry
-- ============================================================

-- 1. Rename the plan
UPDATE public.subscription_plans
SET name = '15-Day Free Trial',
    description = '15-day free access granted automatically on signup. Full platform access, no credit card required.'
WHERE name = '7-Day Free Trial';

-- 2. Update the trigger function to use 15 days instead of 7
CREATE OR REPLACE FUNCTION public.handle_email_verified()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
BEGIN
  IF (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL) THEN

    UPDATE public.profiles
    SET account_status = 'ACTIVE', updated_at = now()
    WHERE id = NEW.id AND account_status = 'PENDING_VERIFICATION';

    SELECT id INTO v_plan_id FROM public.subscription_plans
    WHERE name = '15-Day Free Trial' AND is_active = true LIMIT 1;

    IF v_plan_id IS NOT NULL THEN
      INSERT INTO public.user_subscriptions (user_id, plan_id, status, started_at, expires_at)
      VALUES (NEW.id, v_plan_id, 'ACTIVE', now(), now() + interval '15 days')
      ON CONFLICT DO NOTHING;
    END IF;

  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_email_verified IS
  'Activates profile and starts 15-day free trial only after email OTP is verified';
