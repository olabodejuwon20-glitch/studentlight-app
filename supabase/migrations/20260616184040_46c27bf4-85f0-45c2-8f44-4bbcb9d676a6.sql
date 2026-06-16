DROP POLICY IF EXISTS trad_assets_student_active_attempt_read ON storage.objects;

CREATE POLICY trad_assets_student_active_attempt_read
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
      AND a.school_id::text = (storage.foldername(objects.name))[1]
      AND a.exam_id::text = (storage.foldername(objects.name))[2]
  )
);