
-- 1) Defense-in-depth restrictive policy on exam_questions to ensure ONLY teachers/admins can read,
-- preventing correct_index exposure even if a future permissive policy is added.
DROP POLICY IF EXISTS "exam_questions_restrict_to_staff" ON public.exam_questions;
CREATE POLICY "exam_questions_restrict_to_staff"
ON public.exam_questions
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  public.has_school_role(school_id, auth.uid(), 'teacher'::member_role)
  OR public.is_school_admin(school_id, auth.uid())
);

-- 2) Allow students with an active (in_progress) attempt to read trad-exam-assets
-- scoped to the same school folder.
DROP POLICY IF EXISTS "trad_assets_student_active_attempt_read" ON storage.objects;
CREATE POLICY "trad_assets_student_active_attempt_read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'trad-exam-assets'
  AND EXISTS (
    SELECT 1
    FROM public.trad_exam_attempts a
    WHERE a.student_id = auth.uid()
      AND a.status = 'in_progress'
      AND a.school_id::text = (storage.foldername(name))[1]
  )
);
