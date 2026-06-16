
-- ============================================
-- 1) Per-tenant rate limiting
-- ============================================
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NULL,
  user_id uuid NULL,
  key text NOT NULL,
  window_start timestamptz NOT NULL DEFAULT now(),
  count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS rate_limits_scope_idx
  ON public.rate_limits (COALESCE(school_id, '00000000-0000-0000-0000-000000000000'::uuid),
                         COALESCE(user_id,   '00000000-0000-0000-0000-000000000000'::uuid),
                         key, window_start);
CREATE INDEX IF NOT EXISTS rate_limits_window_idx ON public.rate_limits (window_start);

GRANT SELECT ON public.rate_limits TO authenticated;
GRANT ALL ON public.rate_limits TO service_role;

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rate_limits super read" ON public.rate_limits;
CREATE POLICY "rate_limits super read" ON public.rate_limits
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

-- check_rate_limit: bump counter inside current window; return true if under budget.
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  _key text,
  _max integer,
  _window_seconds integer,
  _school_id uuid DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_window timestamptz := date_trunc('second', now()) - (extract(epoch from now())::bigint % GREATEST(_window_seconds,1)) * interval '1 second';
  v_count int;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;

  INSERT INTO public.rate_limits (school_id, user_id, key, window_start, count)
  VALUES (_school_id, v_uid, _key, v_window, 1)
  ON CONFLICT (COALESCE(school_id, '00000000-0000-0000-0000-000000000000'::uuid),
               COALESCE(user_id,   '00000000-0000-0000-0000-000000000000'::uuid),
               key, window_start)
  DO UPDATE SET count = public.rate_limits.count + 1,
                updated_at = now()
  RETURNING count INTO v_count;

  RETURN v_count <= _max;
END $$;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer, uuid) TO authenticated, service_role;

-- ============================================
-- 2) Soft delete columns
-- ============================================
ALTER TABLE public.schools                ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
ALTER TABLE public.platform_announcements ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
ALTER TABLE public.announcements          ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;
ALTER TABLE public.modules                ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS schools_deleted_at_idx                ON public.schools (deleted_at);
CREATE INDEX IF NOT EXISTS platform_announcements_deleted_at_idx ON public.platform_announcements (deleted_at);
CREATE INDEX IF NOT EXISTS announcements_deleted_at_idx          ON public.announcements (deleted_at);
CREATE INDEX IF NOT EXISTS modules_deleted_at_idx                ON public.modules (deleted_at);
