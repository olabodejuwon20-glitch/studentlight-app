
DROP POLICY IF EXISTS "Members view questions" ON public.exam_questions;
CREATE POLICY "Teachers/Admins view exam questions"
  ON public.exam_questions FOR SELECT
  USING (public.has_school_role(school_id, auth.uid(), 'teacher'::member_role) OR public.is_school_admin(school_id, auth.uid()));
GRANT SELECT ON public.exam_questions TO authenticated;

CREATE OR REPLACE FUNCTION public.get_exam_questions_for_attempt(_attempt_id uuid)
RETURNS TABLE(q_id uuid, q_exam_id uuid, q_school_id uuid, q_prompt text, q_options jsonb, q_points integer, q_position integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_school uuid; v_student uuid; v_exam uuid;
BEGIN
  SELECT a.school_id, a.student_id, a.exam_id INTO v_school, v_student, v_exam
  FROM public.exam_attempts a WHERE a.id = _attempt_id;
  IF v_school IS NULL THEN RAISE EXCEPTION 'attempt not found'; END IF;
  IF NOT (v_student = auth.uid()
          OR public.has_school_role(v_school, auth.uid(), 'teacher'::member_role)
          OR public.is_school_admin(v_school, auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT q.id, q.exam_id, q.school_id, q.prompt, q.options, q.points, q.position
    FROM public.exam_questions q WHERE q.exam_id = v_exam ORDER BY q.position;
END $$;
REVOKE EXECUTE ON FUNCTION public.get_exam_questions_for_attempt(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_exam_questions_for_attempt(uuid) TO authenticated;

DROP POLICY IF EXISTS "Members view mock questions" ON public.mock_questions;
CREATE POLICY "Teachers/Admins view mock questions"
  ON public.mock_questions FOR SELECT
  USING (public.has_school_role(school_id, auth.uid(), 'teacher'::member_role) OR public.is_school_admin(school_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.get_mock_questions_for_session(_session_id uuid)
RETURNS TABLE(q_id uuid, q_subject_id uuid, q_position integer, q_prompt text, q_options jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_school uuid; v_student uuid;
BEGIN
  SELECT s.school_id, s.student_id INTO v_school, v_student
  FROM public.mock_sessions s WHERE s.id = _session_id;
  IF v_school IS NULL THEN RAISE EXCEPTION 'session not found'; END IF;
  IF NOT (v_student = auth.uid()
          OR public.has_school_role(v_school, auth.uid(), 'teacher'::member_role)
          OR public.is_school_admin(v_school, auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT q.id, q.subject_id, q.position, q.prompt, q.options
    FROM public.mock_questions q
    WHERE q.subject_id IN (SELECT subject_id FROM public.mock_session_subjects WHERE session_id = _session_id)
    ORDER BY q.subject_id, q.position;
END $$;
REVOKE EXECUTE ON FUNCTION public.get_mock_questions_for_session(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_mock_questions_for_session(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.grade_mock_session(_session_id uuid, _auto boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_school uuid; v_student uuid; v_status text;
        v_total int := 0; v_questions int := 0;
        rec RECORD;
BEGIN
  SELECT s.school_id, s.student_id, s.status INTO v_school, v_student, v_status
  FROM public.mock_sessions s WHERE s.id = _session_id;
  IF v_school IS NULL THEN RAISE EXCEPTION 'session not found'; END IF;
  IF v_student <> auth.uid() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF v_status IN ('submitted','expired') THEN RAISE EXCEPTION 'already submitted'; END IF;

  FOR rec IN
    SELECT q.subject_id,
           COUNT(*) FILTER (WHERE a.selected_index IS NOT NULL) AS answered,
           COUNT(*) FILTER (WHERE a.selected_index = q.correct_index) AS score
    FROM public.mock_questions q
    LEFT JOIN public.mock_answers a ON a.question_id = q.id AND a.session_id = _session_id
    WHERE q.subject_id IN (SELECT subject_id FROM public.mock_session_subjects WHERE session_id = _session_id)
    GROUP BY q.subject_id
  LOOP
    UPDATE public.mock_session_subjects
      SET score = rec.score, answered_count = rec.answered
      WHERE session_id = _session_id AND subject_id = rec.subject_id;
    v_total := v_total + rec.score;
  END LOOP;

  SELECT COUNT(*) INTO v_questions
  FROM public.mock_questions
  WHERE subject_id IN (SELECT subject_id FROM public.mock_session_subjects WHERE session_id = _session_id);

  UPDATE public.mock_sessions SET
    status = CASE WHEN _auto THEN 'expired' ELSE 'submitted' END,
    submitted_at = now(),
    total_score = v_total,
    total_questions = v_questions
  WHERE id = _session_id;

  RETURN jsonb_build_object('total_score', v_total, 'total_questions', v_questions);
END $$;
REVOKE EXECUTE ON FUNCTION public.grade_mock_session(uuid, boolean) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.grade_mock_session(uuid, boolean) TO authenticated;

DROP POLICY IF EXISTS "Members view question bank" ON public.question_bank;
CREATE POLICY "Teachers/Admins view question bank"
  ON public.question_bank FOR SELECT
  USING (public.has_school_role(school_id, auth.uid(), 'teacher'::member_role) OR public.is_school_admin(school_id, auth.uid()));

DROP POLICY IF EXISTS "ticket parties read messages" ON public.support_messages;
CREATE POLICY "ticket parties read messages"
  ON public.support_messages FOR SELECT
  USING (
    public.is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_messages.ticket_id
        AND (
          (t.school_id IS NOT NULL AND public.is_school_admin(t.school_id, auth.uid()))
          OR (t.opened_by = auth.uid() AND support_messages.internal = false)
        )
    )
  );

REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) FROM anon, public;
GRANT  EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) TO authenticated;
