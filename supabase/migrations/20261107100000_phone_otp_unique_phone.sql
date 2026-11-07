-- ============================================================
-- Migration: Enforce uniqueness on phone_otp_requests.phone
--
-- The original phone_otp.sql only put UNIQUE on registration_token.
-- This left a race-condition window: two concurrent signup attempts
-- with the same phone could both INSERT rows, and neither would
-- be caught until the final profiles INSERT hit the UNIQUE constraint
-- with a raw DB error.
--
-- Fix: add a UNIQUE constraint on phone so the DB enforces
-- one active pending session per phone number at all times.
-- The app-layer check in initiateRegistration() is kept as a
-- user-friendly pre-flight, but the DB is now the true backstop.
-- ============================================================

ALTER TABLE public.phone_otp_requests
  ADD CONSTRAINT phone_otp_requests_phone_unique UNIQUE (phone);
