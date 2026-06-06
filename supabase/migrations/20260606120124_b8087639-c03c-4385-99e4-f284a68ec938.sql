
-- 1. Remove client_errors from realtime publication (prevents cross-tenant leak via postgres_changes)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'client_errors'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.client_errors';
  END IF;
END $$;

-- 2. payment-proofs: allow uploader + school admins to DELETE
DROP POLICY IF EXISTS "payment_proofs_delete_uploader" ON storage.objects;
CREATE POLICY "payment_proofs_delete_uploader"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS "payment_proofs_delete_admin" ON storage.objects;
CREATE POLICY "payment_proofs_delete_admin"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND public.is_school_admin(((storage.foldername(name))[1])::uuid, auth.uid())
);

-- 3. proctor-snapshots: allow school admins to DELETE
DROP POLICY IF EXISTS "proctor_snapshots_delete_admin" ON storage.objects;
CREATE POLICY "proctor_snapshots_delete_admin"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'proctor-snapshots'
  AND public.is_school_admin(((storage.foldername(name))[1])::uuid, auth.uid())
);
