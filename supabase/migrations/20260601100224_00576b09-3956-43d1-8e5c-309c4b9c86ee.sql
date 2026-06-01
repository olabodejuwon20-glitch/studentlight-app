
CREATE TABLE public.lesson_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  class_id uuid,
  subject text NOT NULL,
  topic text NOT NULL,
  duration_minutes int NOT NULL DEFAULT 40,
  curriculum text,                  -- 'WAEC' | 'NECO' | 'JAMB' | 'NERDC' | null
  grade_level text,
  content text NOT NULL,            -- markdown body
  status text NOT NULL DEFAULT 'draft', -- draft|approved|shared|archived
  ai_job_id uuid REFERENCES public.ai_jobs(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lesson_plans_teacher_idx ON public.lesson_plans (teacher_id, created_at DESC);
CREATE INDEX lesson_plans_school_idx ON public.lesson_plans (school_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lesson_plans TO authenticated;
GRANT ALL ON public.lesson_plans TO service_role;
ALTER TABLE public.lesson_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers see own plans; admins see school plans"
  ON public.lesson_plans FOR SELECT TO authenticated
  USING (
    teacher_id = auth.uid()
    OR public.is_school_admin(school_id, auth.uid())
  );

CREATE POLICY "Teachers create their own plans"
  ON public.lesson_plans FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id = auth.uid()
    AND public.has_school_role(school_id, auth.uid(), 'teacher'::member_role)
  );

CREATE POLICY "Teachers update their own plans"
  ON public.lesson_plans FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid());

CREATE POLICY "Teachers delete their own plans"
  ON public.lesson_plans FOR DELETE TO authenticated
  USING (teacher_id = auth.uid());

CREATE TRIGGER lesson_plans_updated_at
  BEFORE UPDATE ON public.lesson_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
