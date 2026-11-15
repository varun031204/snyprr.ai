-- ============================================================
-- Migration: Fix handle_new_user to safely handle phone
--
-- The original trigger fails with CHECK constraint violation when
-- phone is NULL or empty, because it passes the raw value directly
-- to the INSERT. This version:
--   1. Uses normalize_phone() so formatting is consistent
--   2. Passes NULL (not empty string) when phone is absent/empty
--   3. Keeps account_status = 'PENDING_VERIFICATION' (email OTP flow)
--   4. Does NOT start a free trial here — that happens in
--      handle_email_verified() after email is confirmed
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role_id uuid;
  v_phone   text;
BEGIN
  -- Safely normalize the phone — returns NULL for empty/missing values
  v_phone := public.normalize_phone(
    coalesce(new.raw_user_meta_data->>'phone', '')
  );

  -- If normalize returned an empty string, treat as NULL
  IF v_phone = '' THEN
    v_phone := NULL;
  END IF;

  -- Insert profile as PENDING_VERIFICATION — activated after email OTP
  INSERT INTO public.profiles (id, email, phone, full_name, account_status)
  VALUES (
    new.id,
    new.email,
    v_phone,
    new.raw_user_meta_data->>'full_name',
    'PENDING_VERIFICATION'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Assign 'user' role immediately (JWT claims need it)
  SELECT id INTO v_role_id FROM public.roles WHERE name = 'user';
  INSERT INTO public.user_roles (user_id, role_id)
  VALUES (new.id, v_role_id)
  ON CONFLICT DO NOTHING;

  RETURN new;
END;
$$;

-- Re-attach the trigger (in case it was pointing to the old version)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

COMMENT ON FUNCTION public.handle_new_user IS
  'Creates PENDING_VERIFICATION profile on signup. Free trial starts in handle_email_verified after OTP.';
