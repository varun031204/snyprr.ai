-- 20260916000000_notifications_table.sql
-- Create notifications table for in-app notifications and alerts

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'SYSTEM',
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  link text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications' AND policyname = 'Users read own'
  ) THEN
    CREATE POLICY "Users read own" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
  END IF;
END
$policy$;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications' AND policyname = 'Users update own'
  ) THEN
    CREATE POLICY "Users update own" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
  END IF;
END
$policy$;

DO $policy$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'notifications' AND policyname = 'Service insert all'
  ) THEN
    CREATE POLICY "Service insert all" ON public.notifications FOR INSERT WITH CHECK (true);
  END IF;
END
$policy$;
