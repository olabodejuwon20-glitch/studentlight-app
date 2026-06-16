-- Consolidated hardening for remaining realtime/answer-key/open grant issues

CREATE OR REPLACE FUNCTION public.can_read_platform_announcement(_announcement public.platform_announcements)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;
  IF public.is_super_admin(v_uid) THEN RETURN true; END IF;
  IF _announcement.deleted_at IS NOT NULL THEN RETURN false; END IF;
  IF _announcement.scheduled_for IS NOT NULL AND _announcement.scheduled_for > now() THEN RETURN false; END IF;
  IF _announcement.audience = 'all' THEN RETURN true; END IF;

  IF _announcement.audience = 'admins' THEN
    RETURN EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = v_uid AND m.status = 'active' AND m.role = 'admin'
        AND (NOT (_announcement.target ? 'school_id') OR m.school_id::text = _announcement.target->>'school_id')
    );
  END IF;

  IF _announcement.audience IN ('teachers', 'students', 'parents') THEN
    RETURN EXISTS (
      SELECT 1 FROM public.memberships m
      WHERE m.user_id = v_uid AND m.status = 'active'
        AND m.role = CASE _announcement.audience
          WHEN 'teachers' THEN 'teacher'::public.member_role
          WHEN 'students' THEN 'student'::public.member_role
          WHEN 'parents' THEN 'parent'::public.member_role
        END
        AND (NOT (_announcement.target ? 'school_id') OR m.school_id::text = _announcement.target->>'school_id')
    );
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.can_read_platform_announcement(public.platform_announcements) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_read_platform_announcement(public.platform_announcements) TO authenticated, service_role;

DROP POLICY IF EXISTS "anyone authed reads platform announcements" ON public.platform_announcements;
DROP POLICY IF EXISTS "Targeted users read platform announcements" ON public.platform_announcements;
CREATE POLICY "Targeted users read platform announcements"
ON public.platform_announcements
FOR SELECT
TO authenticated
USING (public.can_read_platform_announcement(platform_announcements));
REVOKE ALL ON public.platform_announcements FROM anon;

DROP POLICY IF EXISTS "Authenticated may publish realtime topics for self" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated may read realtime topics for self" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can read scoped realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can send scoped realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Realtime read scoped to user or conversation participant" ON realtime.messages;
DROP POLICY IF EXISTS "Realtime send scoped to user or conversation participant" ON realtime.messages;
DROP POLICY IF EXISTS "Realtime read explicit app topics" ON realtime.messages;
DROP POLICY IF EXISTS "Realtime send explicit app topics" ON realtime.messages;

CREATE POLICY "Realtime read explicit app topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL AND (
    public.is_super_admin(auth.uid())
    OR (realtime.topic() LIKE 'conv:%' AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.user_id = auth.uid()
        AND cp.conversation_id::text = split_part(substring(realtime.topic() FROM 6), ':', 1)
    ))
    OR realtime.topic() LIKE 'typing:' || auth.uid()::text || ':%'
    OR realtime.topic() LIKE 'typing:%:' || auth.uid()::text || ':%'
    OR realtime.topic() LIKE 'msg-thread:' || auth.uid()::text || ':%'
    OR realtime.topic() LIKE 'msg-thread:%:' || auth.uid()::text || ':%'
    OR realtime.topic() LIKE 'notifier:' || auth.uid()::text || ':%'
    OR realtime.topic() LIKE 'notif-bell:' || auth.uid()::text || ':%'
    OR realtime.topic() LIKE 'comms:' || auth.uid()::text || ':%'
    OR realtime.topic() LIKE 'comms-bell:' || auth.uid()::text || ':%'
  )
);

CREATE POLICY "Realtime send explicit app topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    public.is_super_admin(auth.uid())
    OR (realtime.topic() LIKE 'conv:%' AND EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.user_id = auth.uid()
        AND cp.conversation_id::text = split_part(substring(realtime.topic() FROM 6), ':', 1)
    ))
    OR realtime.topic() LIKE 'typing:' || auth.uid()::text || ':%'
    OR realtime.topic() LIKE 'typing:%:' || auth.uid()::text || ':%'
    OR realtime.topic() LIKE 'msg-thread:' || auth.uid()::text || ':%'
    OR realtime.topic() LIKE 'msg-thread:%:' || auth.uid()::text || ':%'
    OR realtime.topic() LIKE 'notifier:' || auth.uid()::text || ':%'
    OR realtime.topic() LIKE 'notif-bell:' || auth.uid()::text || ':%'
    OR realtime.topic() LIKE 'comms:' || auth.uid()::text || ':%'
    OR realtime.topic() LIKE 'comms-bell:' || auth.uid()::text || ':%'
  )
);

REVOKE ALL ON public.mock_questions FROM anon;
REVOKE ALL ON public.trad_exam_questions FROM anon;
REVOKE ALL ON public.exam_questions FROM anon;

REVOKE SELECT ON public.mock_questions FROM authenticated;
REVOKE SELECT ON public.trad_exam_questions FROM authenticated;
REVOKE SELECT ON public.exam_questions FROM authenticated;

GRANT SELECT (id, school_id, subject_id, position, prompt, options, created_at) ON public.mock_questions TO authenticated;
GRANT SELECT (id, exam_id, school_id, position, prompt, options, points) ON public.exam_questions TO authenticated;
GRANT SELECT (id, school_id, exam_id, section_id, position, type, prompt, options, marks, image_path, ai_generated, created_at, updated_at) ON public.trad_exam_questions TO authenticated;

CREATE OR REPLACE FUNCTION public.trad_get_paper_questions(_exam_id uuid)
RETURNS TABLE(
  q_id uuid,
  q_school_id uuid,
  q_exam_id uuid,
  q_section_id uuid,
  q_position integer,
  q_type text,
  q_prompt text,
  q_options jsonb,
  q_correct_index integer,
  q_model_answer text,
  q_marks integer,
  q_image_path text,
  q_explanation text,
  q_ai_generated boolean,
  q_created_at timestamptz,
  q_updated_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_school uuid;
  v_author uuid;
BEGIN
  SELECT e.school_id, e.author_id INTO v_school, v_author
  FROM public.trad_exams e
  WHERE e.id = _exam_id;

  IF v_school IS NULL THEN RAISE EXCEPTION 'exam not found'; END IF;
  IF NOT (public.is_school_admin(v_school, auth.uid()) OR v_author = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT q.id, q.school_id, q.exam_id, q.section_id, q.position, q.type::text,
         q.prompt, q.options, q.correct_index, q.model_answer, q.marks,
         q.image_path, q.explanation, q.ai_generated, q.created_at, q.updated_at
  FROM public.trad_exam_questions q
  WHERE q.exam_id = _exam_id
  ORDER BY q.position;
END;
$$;

CREATE OR REPLACE FUNCTION public.trad_get_theory_grading_queue(_school_id uuid)
RETURNS TABLE(
  answer_id uuid,
  text_answer text,
  marks_awarded numeric,
  graded_at timestamptz,
  feedback text,
  student_id uuid,
  attempt_status text,
  submitted_at timestamptz,
  question_id uuid,
  prompt text,
  marks integer,
  model_answer text,
  exam_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_school_admin(_school_id, auth.uid()) OR public.has_school_role(_school_id, auth.uid(), 'teacher'::public.member_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT a.id, a.text_answer, a.marks_awarded, a.graded_at, a.feedback,
         ta.student_id, ta.status, ta.submitted_at,
         q.id, q.prompt, q.marks, q.model_answer, q.exam_id
  FROM public.trad_exam_answers a
  JOIN public.trad_exam_attempts ta ON ta.id = a.attempt_id
  JOIN public.trad_exam_questions q ON q.id = a.question_id
  JOIN public.trad_exams e ON e.id = q.exam_id
  WHERE a.school_id = _school_id
    AND q.type = 'theory'
    AND a.graded_at IS NULL
    AND ta.submitted_at IS NOT NULL
    AND (public.is_school_admin(_school_id, auth.uid()) OR e.author_id = auth.uid())
  ORDER BY a.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.trad_get_paper_questions(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.trad_get_theory_grading_queue(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trad_get_paper_questions(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.trad_get_theory_grading_queue(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.get_school_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_school_by_slug(text) TO anon, authenticated, service_role;