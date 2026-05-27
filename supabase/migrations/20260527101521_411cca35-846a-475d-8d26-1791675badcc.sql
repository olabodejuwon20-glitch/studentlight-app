
CREATE POLICY "Members upload own payment proofs" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'payment-proofs'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND EXISTS(
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = auth.uid() AND m.status = 'active'
        AND (storage.foldername(name))[1] = m.school_id::text
    )
  );

CREATE POLICY "Members read own payment proofs" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-proofs'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[2] = auth.uid()::text
  );
