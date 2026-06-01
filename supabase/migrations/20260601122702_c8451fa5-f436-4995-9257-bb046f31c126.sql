-- Allow school admins to manage their AI budget rows
CREATE POLICY "Admins insert quota" ON public.school_ai_quotas
  FOR INSERT TO authenticated
  WITH CHECK (is_school_admin(school_id, auth.uid()));

CREATE POLICY "Admins update quota" ON public.school_ai_quotas
  FOR UPDATE TO authenticated
  USING (is_school_admin(school_id, auth.uid()))
  WITH CHECK (is_school_admin(school_id, auth.uid()));