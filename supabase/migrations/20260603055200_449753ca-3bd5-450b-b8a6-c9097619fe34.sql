
-- 1) Results: publish gate
ALTER TABLE public.results
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_by uuid;

-- Backfill existing rows as already published so students don't lose access
UPDATE public.results SET published_at = COALESCE(published_at, created_at) WHERE published_at IS NULL;

-- Replace student/parent SELECT policy to require published_at
DROP POLICY IF EXISTS "Student/parent/teacher view results" ON public.results;

CREATE POLICY "Teachers/Admins view all results"
ON public.results FOR SELECT
USING (
  has_school_role(school_id, auth.uid(), 'teacher'::member_role)
  OR is_school_admin(school_id, auth.uid())
);

CREATE POLICY "Student views own published results"
ON public.results FOR SELECT
USING (student_id = auth.uid() AND published_at IS NOT NULL);

CREATE POLICY "Parent views child's published results"
ON public.results FOR SELECT
USING (
  published_at IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.parent_links pl
    WHERE pl.school_id = results.school_id
      AND pl.parent_user_id = auth.uid()
      AND pl.student_user_id = results.student_id
  )
);

-- 2) Publish RPC for teachers/admins
CREATE OR REPLACE FUNCTION public.publish_results(_ids uuid[], _publish boolean DEFAULT true)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_count int := 0; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  -- only update rows whose school the caller can manage
  IF _publish THEN
    UPDATE public.results r
       SET published_at = now(), published_by = v_uid
     WHERE r.id = ANY(_ids)
       AND (has_school_role(r.school_id, v_uid, 'teacher'::member_role)
            OR is_school_admin(r.school_id, v_uid));
  ELSE
    UPDATE public.results r
       SET published_at = NULL, published_by = NULL
     WHERE r.id = ANY(_ids)
       AND (has_school_role(r.school_id, v_uid, 'teacher'::member_role)
            OR is_school_admin(r.school_id, v_uid));
  END IF;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

GRANT EXECUTE ON FUNCTION public.publish_results(uuid[], boolean) TO authenticated;

-- 3) Mock session preferences + AI summary cache
ALTER TABLE public.mock_sessions
  ADD COLUMN IF NOT EXISTS questions_per_subject integer NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS fullscreen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_summary jsonb;
