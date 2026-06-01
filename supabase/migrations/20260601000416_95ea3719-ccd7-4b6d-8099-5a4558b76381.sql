-- 1) AI conversations
CREATE TABLE public.ai_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New chat',
  pinned boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO authenticated;
GRANT ALL ON public.ai_conversations TO service_role;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages own conversations"
ON public.ai_conversations FOR ALL
USING (user_id = auth.uid() AND public.is_member(school_id, auth.uid()))
WITH CHECK (user_id = auth.uid() AND public.is_member(school_id, auth.uid()));

CREATE INDEX idx_ai_conversations_user_last ON public.ai_conversations(user_id, last_message_at DESC);

-- 2) Extend ai_chats
ALTER TABLE public.ai_chats
  ADD COLUMN conversation_id uuid REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  ADD COLUMN attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN audio_url text;

CREATE INDEX idx_ai_chats_conversation ON public.ai_chats(conversation_id, created_at);

-- 3) Extend messages with attachments
ALTER TABLE public.messages
  ADD COLUMN attachments jsonb NOT NULL DEFAULT '[]'::jsonb;

-- 4) Private storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutor-uploads', 'tutor-uploads', false),
       ('message-attachments', 'message-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "tutor-uploads owner read"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'tutor-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "tutor-uploads owner write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'tutor-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "tutor-uploads owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'tutor-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "message-attachments owner read"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'message-attachments'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.attachments::text LIKE '%' || storage.objects.name || '%'
        AND (m.sender_id = auth.uid() OR m.recipient_id = auth.uid())
    )
  )
);

CREATE POLICY "message-attachments owner write"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'message-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "message-attachments owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'message-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 5) Review RPCs
CREATE OR REPLACE FUNCTION public.get_exam_review(_attempt_id uuid)
RETURNS TABLE (
  q_id uuid,
  q_position integer,
  q_prompt text,
  q_options jsonb,
  q_points integer,
  q_correct_index integer,
  q_selected_index integer,
  q_is_correct boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_school uuid; v_student uuid; v_exam uuid; v_submitted timestamptz;
BEGIN
  SELECT a.school_id, a.student_id, a.exam_id, a.submitted_at
    INTO v_school, v_student, v_exam, v_submitted
  FROM public.exam_attempts a WHERE a.id = _attempt_id;
  IF v_school IS NULL THEN RAISE EXCEPTION 'attempt not found'; END IF;
  IF v_submitted IS NULL THEN RAISE EXCEPTION 'attempt not submitted'; END IF;
  IF NOT (v_student = auth.uid()
          OR public.has_school_role(v_school, auth.uid(), 'teacher'::member_role)
          OR public.is_school_admin(v_school, auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT q.id, q.position, q.prompt, q.options, q.points,
         q.correct_index,
         ans.selected_index,
         (ans.selected_index IS NOT NULL AND ans.selected_index = q.correct_index) AS is_correct
  FROM public.exam_questions q
  LEFT JOIN public.exam_answers ans
    ON ans.question_id = q.id AND ans.attempt_id = _attempt_id
  WHERE q.exam_id = v_exam
  ORDER BY q.position;
END $$;

GRANT EXECUTE ON FUNCTION public.get_exam_review(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_mock_review(_session_id uuid)
RETURNS TABLE (
  q_id uuid,
  q_subject_id uuid,
  q_position integer,
  q_prompt text,
  q_options jsonb,
  q_correct_index integer,
  q_selected_index integer,
  q_explanation text,
  q_is_correct boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_school uuid; v_student uuid; v_status text;
BEGIN
  SELECT s.school_id, s.student_id, s.status
    INTO v_school, v_student, v_status
  FROM public.mock_sessions s WHERE s.id = _session_id;
  IF v_school IS NULL THEN RAISE EXCEPTION 'session not found'; END IF;
  IF v_status NOT IN ('submitted','expired') THEN RAISE EXCEPTION 'session not submitted'; END IF;
  IF NOT (v_student = auth.uid()
          OR public.has_school_role(v_school, auth.uid(), 'teacher'::member_role)
          OR public.is_school_admin(v_school, auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT q.id, q.subject_id, q.position, q.prompt, q.options,
         q.correct_index,
         a.selected_index,
         q.explanation,
         (a.selected_index IS NOT NULL AND a.selected_index = q.correct_index) AS is_correct
  FROM public.mock_questions q
  LEFT JOIN public.mock_answers a
    ON a.question_id = q.id AND a.session_id = _session_id
  WHERE q.subject_id IN (SELECT subject_id FROM public.mock_session_subjects WHERE session_id = _session_id)
  ORDER BY q.subject_id, q.position;
END $$;

GRANT EXECUTE ON FUNCTION public.get_mock_review(uuid) TO authenticated;