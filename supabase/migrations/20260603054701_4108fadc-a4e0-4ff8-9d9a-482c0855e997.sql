
-- 1) Drop permissive realtime broadcast policies that let any authenticated user subscribe/publish to any channel
DROP POLICY IF EXISTS "authenticated can use realtime" ON realtime.messages;
DROP POLICY IF EXISTS "authenticated can publish realtime" ON realtime.messages;

-- 2) Add missing UPDATE policy on storage.objects for the 'library' bucket (teachers/admins of the owning school)
DROP POLICY IF EXISTS "Teachers/Admins update library files" ON storage.objects;
CREATE POLICY "Teachers/Admins update library files"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'library'
  AND (
    public.has_school_role(((storage.foldername(name))[1])::uuid, auth.uid(), 'teacher'::public.member_role)
    OR public.is_school_admin(((storage.foldername(name))[1])::uuid, auth.uid())
  )
)
WITH CHECK (
  bucket_id = 'library'
  AND (
    public.has_school_role(((storage.foldername(name))[1])::uuid, auth.uid(), 'teacher'::public.member_role)
    OR public.is_school_admin(((storage.foldername(name))[1])::uuid, auth.uid())
  )
);
