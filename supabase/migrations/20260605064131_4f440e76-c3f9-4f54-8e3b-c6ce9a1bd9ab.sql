
-- Client error reporting + realtime
CREATE TABLE IF NOT EXISTS public.client_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  school_id uuid,
  route text,
  source text,             -- 'window' | 'unhandledrejection' | 'react' | 'manual' | 'supabase'
  message text NOT NULL,
  cause text,
  stack text,
  user_agent text,
  severity text DEFAULT 'error',
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.client_errors TO anon, authenticated;
GRANT SELECT ON public.client_errors TO authenticated;
GRANT ALL ON public.client_errors TO service_role;

ALTER TABLE public.client_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone records client error"
  ON public.client_errors FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "super reads client errors"
  ON public.client_errors FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_client_errors_created_at ON public.client_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_client_errors_user ON public.client_errors(user_id);

ALTER TABLE public.client_errors REPLICA IDENTITY FULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'client_errors'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.client_errors';
  END IF;
END $$;
