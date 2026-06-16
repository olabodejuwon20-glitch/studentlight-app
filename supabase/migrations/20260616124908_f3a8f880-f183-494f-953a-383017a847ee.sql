
DROP VIEW IF EXISTS public.public_profiles;

CREATE OR REPLACE FUNCTION public.get_public_profiles(_ids uuid[])
RETURNS TABLE (id uuid, full_name text, photo_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.full_name, p.photo_url
  FROM public.profiles p
  WHERE p.id = ANY(_ids)
    AND (
      p.id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.memberships m1
        JOIN public.memberships m2 ON m1.school_id = m2.school_id
        WHERE m1.user_id = auth.uid() AND m1.status = 'active'
          AND m2.user_id = p.id AND m2.status = 'active'
      )
    )
$$;

REVOKE ALL ON FUNCTION public.get_public_profiles(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(uuid[]) TO authenticated;
