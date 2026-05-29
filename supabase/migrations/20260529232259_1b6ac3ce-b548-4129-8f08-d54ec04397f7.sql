
CREATE TABLE public.result_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  term text,
  session text,
  snapshot jsonb NOT NULL,
  issued_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_result_verifications_student ON public.result_verifications(student_id);

GRANT SELECT ON public.result_verifications TO anon;
GRANT SELECT ON public.result_verifications TO authenticated;
GRANT ALL ON public.result_verifications TO service_role;

ALTER TABLE public.result_verifications ENABLE ROW LEVEL SECURITY;

-- Public read so a QR scan (no login) can validate authenticity.
-- Snapshot intentionally contains only verification-safe details
-- (student name, admission no, class, subjects, scores, grades, school).
CREATE POLICY "Anyone can verify a result slip"
ON public.result_verifications
FOR SELECT
USING (true);
