
-- 1) Tighten trad_exam_questions author read — only own drafts/submitted
DROP POLICY IF EXISTS trad_questions_author_read ON public.trad_exam_questions;
CREATE POLICY trad_questions_author_read ON public.trad_exam_questions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trad_exams e
    WHERE e.id = trad_exam_questions.exam_id
      AND e.author_id = auth.uid()
      AND e.draft_status = ANY (ARRAY['draft'::trad_draft_status, 'submitted'::trad_draft_status])
  ));

-- 2) Hide memberships.profile_data column from clients; access only via RPCs
REVOKE SELECT (profile_data) ON public.memberships FROM authenticated;
REVOKE SELECT (profile_data) ON public.memberships FROM anon;
-- writes still need column access (Bio.tsx updates own row)
GRANT UPDATE (profile_data), INSERT (profile_data) ON public.memberships TO authenticated;

-- 3) Hide pin_hash on trad_scratch_cards from clients (only edge functions via service_role)
REVOKE SELECT (pin_hash) ON public.trad_scratch_cards FROM authenticated;
REVOKE SELECT (pin_hash) ON public.trad_scratch_cards FROM anon;
