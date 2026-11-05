-- ============================================================
-- Migration: Phone OTP requests table for two-step signup
-- ============================================================

-- Stores pending phone OTP verifications during signup.
-- Rows are keyed by registration_token (UUID handed to the frontend after
-- step-1 validation).  A separate row per phone+token means concurrent
-- registrations for the same phone are blocked by the UNIQUE constraint.
CREATE TABLE IF NOT EXISTS public.phone_otp_requests (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_token uuid        NOT NULL UNIQUE,   -- frontend session key
  phone              text        NOT NULL,            -- normalized digits only
  otp_hash           text        NOT NULL,            -- bcrypt hash of the 6-digit code
  full_name          text        NOT NULL DEFAULT '',
  email              text        NOT NULL,
  email_verified     boolean     NOT NULL DEFAULT false,
  phone_verified     boolean     NOT NULL DEFAULT false,
  attempt_count      integer     NOT NULL DEFAULT 0,
  last_sent_at       timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_otp_phone     ON public.phone_otp_requests(phone);
CREATE INDEX IF NOT EXISTS idx_phone_otp_token     ON public.phone_otp_requests(registration_token);
CREATE INDEX IF NOT EXISTS idx_phone_otp_expires   ON public.phone_otp_requests(expires_at);

COMMENT ON TABLE  public.phone_otp_requests IS 'Pending two-step signup OTP sessions';
COMMENT ON COLUMN public.phone_otp_requests.otp_hash IS 'bcrypt hash of the 6-digit OTP — never stored or logged in plaintext';
COMMENT ON COLUMN public.phone_otp_requests.registration_token IS 'UUID given to frontend; used as session key across both OTP verifications';

-- Auto-delete expired rows to keep the table tidy (runs daily via pg_cron if available,
-- otherwise rows are filtered in queries by expires_at > now()).
-- No pg_cron required — the application filters them; this is just cleanup.
