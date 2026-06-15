
-- 1) trad_exam_questions: restrict teacher reads to authored exams only
DROP POLICY IF EXISTS trad_questions_school_staff_read ON public.trad_exam_questions;

CREATE POLICY trad_questions_admin_read ON public.trad_exam_questions
  FOR SELECT TO authenticated
  USING (is_school_admin(school_id, auth.uid()));

CREATE POLICY trad_questions_author_read ON public.trad_exam_questions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trad_exams e
    WHERE e.id = trad_exam_questions.exam_id
      AND e.author_id = auth.uid()
  ));

-- 2) student_topic_mastery: add INSERT/UPDATE policies
CREATE POLICY stm_student_insert_self ON public.student_topic_mastery
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY stm_student_update_self ON public.student_topic_mastery
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY stm_staff_insert ON public.student_topic_mastery
  FOR INSERT TO authenticated
  WITH CHECK (
    has_school_role(school_id, auth.uid(), 'teacher'::member_role)
    OR is_school_admin(school_id, auth.uid())
  );

CREATE POLICY stm_staff_update ON public.student_topic_mastery
  FOR UPDATE TO authenticated
  USING (
    has_school_role(school_id, auth.uid(), 'teacher'::member_role)
    OR is_school_admin(school_id, auth.uid())
  )
  WITH CHECK (
    has_school_role(school_id, auth.uid(), 'teacher'::member_role)
    OR is_school_admin(school_id, auth.uid())
  );

CREATE POLICY stm_admin_delete ON public.student_topic_mastery
  FOR DELETE TO authenticated
  USING (is_school_admin(school_id, auth.uid()));

-- 3) memberships.profile_data column-level lockdown
-- Block direct reads of profile_data by clients; admins use security-definer RPC.
REVOKE SELECT (profile_data) ON public.memberships FROM authenticated;
REVOKE SELECT (profile_data) ON public.memberships FROM anon;

-- 4) tutor-uploads bucket: require active school membership for INSERT
DROP POLICY IF EXISTS "tutor-uploads owner write" ON storage.objects;

CREATE POLICY "tutor-uploads member write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tutor-uploads'
    AND (auth.uid())::text = (storage.foldername(name))[1]
    AND EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid() AND m.status = 'active'
    )
  );
