
-- 1) memberships.profile_data: restrict column reads
REVOKE SELECT (profile_data) ON public.memberships FROM authenticated;
REVOKE SELECT (profile_data) ON public.memberships FROM anon;

CREATE OR REPLACE FUNCTION public.get_my_membership_profile(_school uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT profile_data FROM public.memberships
   WHERE school_id = _school AND user_id = auth.uid()
   LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.get_my_membership_profile(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_memberships_with_profile(_school uuid, _role member_role)
RETURNS TABLE(user_id uuid, created_at timestamptz, bio_completed boolean, profile_data jsonb, role member_role)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (public.is_school_admin(_school, auth.uid())
          OR public.has_school_role(_school, auth.uid(), 'teacher'::member_role)
          OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT m.user_id, m.created_at, m.bio_completed, m.profile_data, m.role
    FROM public.memberships m
    WHERE m.school_id = _school AND m.role = _role AND m.status = 'active'
    ORDER BY m.created_at DESC;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_list_memberships_with_profile(uuid, member_role) TO authenticated;

-- 2) storage.objects: replace bypassable LIKE check with strict JSONB path match
DROP POLICY IF EXISTS "message-attachments owner read" ON storage.objects;
CREATE POLICY "message-attachments owner read"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'message-attachments'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.messages m, jsonb_array_elements(m.attachments) att
      WHERE (m.sender_id = auth.uid() OR m.recipient_id = auth.uid())
        AND att->>'path' = objects.name
    )
  )
);

-- 3) questions_v2: drop the global-bank read branch that exposed correct answers
DROP POLICY IF EXISTS "staff and bank readers view questions" ON public.questions_v2;
CREATE POLICY "staff view questions"
ON public.questions_v2 FOR SELECT
TO authenticated
USING (
  (school_id IS NOT NULL AND (
    has_school_role(school_id, auth.uid(), 'teacher'::member_role)
    OR is_school_admin(school_id, auth.uid())
  ))
  OR is_super_admin(auth.uid())
);
