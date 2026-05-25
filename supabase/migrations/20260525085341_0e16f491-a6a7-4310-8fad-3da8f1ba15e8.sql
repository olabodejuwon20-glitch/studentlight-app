-- Allow school admins to upsert config for their own school's modules (but not toggle enabled or alter pricing)
CREATE POLICY "school admins upsert own school_modules config"
ON public.school_modules
FOR INSERT
TO authenticated
WITH CHECK (public.is_school_admin(school_id, auth.uid()));

CREATE POLICY "school admins update own school_modules config"
ON public.school_modules
FOR UPDATE
TO authenticated
USING (public.is_school_admin(school_id, auth.uid()))
WITH CHECK (public.is_school_admin(school_id, auth.uid()));
