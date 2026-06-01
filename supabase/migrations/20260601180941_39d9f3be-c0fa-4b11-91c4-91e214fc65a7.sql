
DROP POLICY IF EXISTS "authenticated can publish realtime" ON public.messages;
DROP POLICY IF EXISTS "authenticated can use realtime" ON public.messages;

DROP POLICY IF EXISTS "School staff read verifications" ON public.result_verifications;
CREATE POLICY "School admins read verifications"
ON public.result_verifications
FOR SELECT
TO authenticated
USING (public.is_school_admin(school_id, auth.uid()));
