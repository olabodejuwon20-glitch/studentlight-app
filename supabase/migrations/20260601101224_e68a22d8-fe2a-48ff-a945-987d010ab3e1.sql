
-- Marking rubrics
CREATE TABLE public.marking_rubrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  subject text,
  name text NOT NULL,
  criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.marking_rubrics TO authenticated;
GRANT ALL ON public.marking_rubrics TO service_role;

ALTER TABLE public.marking_rubrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rubrics_select_members" ON public.marking_rubrics
  FOR SELECT TO authenticated
  USING (public.is_member(school_id, auth.uid()));

CREATE POLICY "rubrics_write_staff" ON public.marking_rubrics
  FOR ALL TO authenticated
  USING (public.has_school_role(school_id, auth.uid(), 'teacher'::member_role)
      OR public.is_school_admin(school_id, auth.uid()))
  WITH CHECK (public.has_school_role(school_id, auth.uid(), 'teacher'::member_role)
      OR public.is_school_admin(school_id, auth.uid()));

CREATE TRIGGER trg_marking_rubrics_updated
  BEFORE UPDATE ON public.marking_rubrics
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_marking_rubrics_school ON public.marking_rubrics(school_id, subject);

-- Essay AI grade columns on existing answers table
ALTER TABLE public.assessment_answers_v2
  ADD COLUMN IF NOT EXISTS ai_grade numeric,
  ADD COLUMN IF NOT EXISTS ai_feedback jsonb,
  ADD COLUMN IF NOT EXISTS ai_job_id uuid;
