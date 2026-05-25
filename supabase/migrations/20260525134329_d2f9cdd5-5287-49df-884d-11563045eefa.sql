
-- Prevent duplicate enrollments
CREATE UNIQUE INDEX IF NOT EXISTS class_enrollments_class_student_key
  ON public.class_enrollments(class_id, student_id);

-- Allow students to self-register in classes within their school
CREATE POLICY "Students self enroll"
ON public.class_enrollments
FOR INSERT
TO authenticated
WITH CHECK (
  student_id = auth.uid()
  AND public.has_school_role(school_id, auth.uid(), 'student'::member_role)
);

-- Allow students to withdraw themselves
CREATE POLICY "Students self withdraw"
ON public.class_enrollments
FOR DELETE
TO authenticated
USING (
  student_id = auth.uid()
  AND public.has_school_role(school_id, auth.uid(), 'student'::member_role)
);
