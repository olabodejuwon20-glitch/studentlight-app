-- ============================================================
-- PART 1: Relationship linking foundations
-- Adds: arms/tracks on classes, guardian fields on parent_links,
--       class_subject_teachers, student_subjects
-- ============================================================

-- A. Guardian model upgrade (additive on parent_links)
ALTER TABLE public.parent_links
  ADD COLUMN IF NOT EXISTS relationship text NOT NULL DEFAULT 'guardian'
    CHECK (relationship IN ('mother','father','guardian','sponsor','other')),
  ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS can_pickup boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS receives_fees boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS receives_results boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS receives_attendance boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS receives_behavior boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS phone_e164 text;

-- B. Class arms + track
ALTER TABLE public.classes
  ADD COLUMN IF NOT EXISTS arm text,
  ADD COLUMN IF NOT EXISTS track text
    CHECK (track IS NULL OR track IN ('science','commercial','arts','general'));

-- C. Teacher <-> Subject <-> Class
CREATE TABLE IF NOT EXISTS public.class_subject_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  class_id uuid NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_user_id uuid NOT NULL,
  session text,
  term text,
  is_lead boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (class_id, subject_id, teacher_user_id, term, session)
);
CREATE INDEX IF NOT EXISTS idx_cst_teacher ON public.class_subject_teachers(teacher_user_id);
CREATE INDEX IF NOT EXISTS idx_cst_class ON public.class_subject_teachers(class_id);
CREATE INDEX IF NOT EXISTS idx_cst_school ON public.class_subject_teachers(school_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.class_subject_teachers TO authenticated;
GRANT ALL ON public.class_subject_teachers TO service_role;

ALTER TABLE public.class_subject_teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cst_members_view" ON public.class_subject_teachers
  FOR SELECT TO authenticated
  USING (
    public.is_member(school_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.parent_links pl
      WHERE pl.school_id = class_subject_teachers.school_id
        AND pl.parent_user_id = auth.uid()
        AND pl.student_user_id IN (
          SELECT ce.student_id FROM public.class_enrollments ce
          WHERE ce.class_id = class_subject_teachers.class_id
        )
    )
  );

CREATE POLICY "cst_admins_manage" ON public.class_subject_teachers
  FOR ALL TO authenticated
  USING (public.is_school_admin(school_id, auth.uid()))
  WITH CHECK (public.is_school_admin(school_id, auth.uid()));

-- D. Student <-> Subject (electives + compulsory)
CREATE TABLE IF NOT EXISTS public.student_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  session text,
  term text,
  status text NOT NULL DEFAULT 'elective'
    CHECK (status IN ('compulsory','elective','dropped')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, subject_id, session, term)
);
CREATE INDEX IF NOT EXISTS idx_ss_student ON public.student_subjects(student_id);
CREATE INDEX IF NOT EXISTS idx_ss_subject ON public.student_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_ss_school ON public.student_subjects(school_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_subjects TO authenticated;
GRANT ALL ON public.student_subjects TO service_role;

ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ss_student_self_view" ON public.student_subjects
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR public.is_school_admin(school_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.parent_links pl
      WHERE pl.school_id = student_subjects.school_id
        AND pl.parent_user_id = auth.uid()
        AND pl.student_user_id = student_subjects.student_id
    )
    OR EXISTS (
      SELECT 1 FROM public.class_subject_teachers cst
      WHERE cst.school_id = student_subjects.school_id
        AND cst.subject_id = student_subjects.subject_id
        AND cst.teacher_user_id = auth.uid()
    )
  );

CREATE POLICY "ss_student_self_manage" ON public.student_subjects
  FOR ALL TO authenticated
  USING (student_id = auth.uid() OR public.is_school_admin(school_id, auth.uid()))
  WITH CHECK (student_id = auth.uid() OR public.is_school_admin(school_id, auth.uid()));
