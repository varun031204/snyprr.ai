-- ============================================================
-- Migration: Restrict profiles.phone to exactly 10 digits
-- Previously allowed 10–15 digits; product decision is now
-- Indian mobile numbers only (exactly 10 digits, no country code).
-- Also updates normalize_phone() to strip the 91 country code.
-- ============================================================

-- Update normalize_phone to handle Indian +91 prefix automatically
CREATE OR REPLACE FUNCTION public.normalize_phone(_phone text)
RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN nullif(regexp_replace(_phone, '[^0-9]', '', 'g'), '') IS NULL THEN NULL
    -- Strip Indian country code: 91XXXXXXXXXX → XXXXXXXXXX
    WHEN regexp_replace(_phone, '[^0-9]', '', 'g') ~ '^91[0-9]{10}$'
      THEN SUBSTRING(regexp_replace(_phone, '[^0-9]', '', 'g') FROM 3)
    ELSE nullif(regexp_replace(_phone, '[^0-9]', '', 'g'), '')
  END;
$$;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_phone_format;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_phone_format
    CHECK (phone IS NULL OR phone ~ '^[0-9]{10}$');
