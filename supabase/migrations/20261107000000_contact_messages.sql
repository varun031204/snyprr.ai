-- ============================================================
-- Migration: contact_messages table
-- Stores all contact/support form submissions from both the
-- public contact page (/contact-us) and the in-app contact
-- page (/contact). Visible to admins in the admin panel.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Who submitted
  user_id     uuid        REFERENCES auth.users(id) ON DELETE SET NULL,  -- NULL for public (unauthenticated) submissions
  name        text        NOT NULL,
  email       text        NOT NULL,
  -- Message content
  category    text        NOT NULL DEFAULT 'GENERAL'
              CHECK (category IN ('GENERAL','TECHNICAL','SUBSCRIPTION','PARTNERSHIP','VERIFICATION','FEEDBACK','DEV_TEAM')),
  subject     text        NOT NULL,
  message     text        NOT NULL,
  source      text        NOT NULL DEFAULT 'public',  -- 'public' | 'in-app' | 'developer'
  -- Admin workflow
  status      text        NOT NULL DEFAULT 'NEW'
              CHECK (status IN ('NEW','IN_PROGRESS','RESOLVED','SPAM')),
  admin_notes text,
  -- Timestamps
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Indexes for admin queries
CREATE INDEX IF NOT EXISTS idx_contact_messages_status     ON public.contact_messages(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_category   ON public.contact_messages(category);
CREATE INDEX IF NOT EXISTS idx_contact_messages_user_id    ON public.contact_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created_at ON public.contact_messages(created_at DESC);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_contact_message_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_contact_messages_updated_at ON public.contact_messages;
CREATE TRIGGER trg_contact_messages_updated_at
  BEFORE UPDATE ON public.contact_messages
  FOR EACH ROW EXECUTE PROCEDURE public.update_contact_message_timestamp();

-- RLS: only admins can read; insert is open (public submissions allowed via service role)
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "contact_messages_admin_all" ON public.contact_messages;
CREATE POLICY "contact_messages_admin_all" ON public.contact_messages
  FOR ALL USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

COMMENT ON TABLE  public.contact_messages IS 'Support/contact form submissions from users and the public';
COMMENT ON COLUMN public.contact_messages.user_id IS 'NULL for unauthenticated (public) submissions';
COMMENT ON COLUMN public.contact_messages.status  IS 'Admin workflow status: NEW → IN_PROGRESS → RESOLVED';
