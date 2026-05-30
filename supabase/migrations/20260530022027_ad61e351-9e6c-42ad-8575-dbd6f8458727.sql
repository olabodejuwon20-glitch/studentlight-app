DROP POLICY IF EXISTS "School members read verifications" ON public.result_verifications;

CREATE POLICY "School staff read verifications"
ON public.result_verifications
FOR SELECT
TO authenticated
USING (
  public.has_school_role(school_id, auth.uid(), 'teacher'::public.member_role)
  OR public.is_school_admin(school_id, auth.uid())
);