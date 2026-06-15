ALTER TABLE public.trad_exams
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

CREATE TABLE IF NOT EXISTS public.trad_exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  exam_id uuid NOT NULL REFERENCES public.trad_exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  status text NOT NULL DEFAULT 'in_progress',
  mcq_score numeric DEFAULT 0,
  theory_score numeric DEFAULT 0,
  total_score numeric DEFAULT 0,
  max_score numeric DEFAULT 0,
  percentage numeric DEFAULT 0,
  integrity_events jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (exam_id, student_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trad_exam_attempts TO authenticated;
GRANT ALL ON public.trad_exam_attempts TO service_role;
ALTER TABLE public.trad_exam_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trad_attempt_select" ON public.trad_exam_attempts FOR SELECT TO authenticated
  USING (student_id = auth.uid()
         OR public.is_school_admin(school_id, auth.uid())
         OR public.has_school_role(school_id, auth.uid(), 'teacher'::member_role));
CREATE POLICY "trad_attempt_insert" ON public.trad_exam_attempts FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid() AND public.is_member(school_id, auth.uid()));
CREATE POLICY "trad_attempt_update" ON public.trad_exam_attempts FOR UPDATE TO authenticated
  USING (student_id = auth.uid()
         OR public.is_school_admin(school_id, auth.uid())
         OR public.has_school_role(school_id, auth.uid(), 'teacher'::member_role));
CREATE POLICY "trad_attempt_admin_delete" ON public.trad_exam_attempts FOR DELETE TO authenticated
  USING (public.is_school_admin(school_id, auth.uid()));
CREATE TRIGGER trad_exam_attempts_set_updated_at BEFORE UPDATE ON public.trad_exam_attempts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.trad_exam_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  attempt_id uuid NOT NULL REFERENCES public.trad_exam_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.trad_exam_questions(id) ON DELETE CASCADE,
  selected_index integer,
  text_answer text,
  is_correct boolean,
  marks_awarded numeric DEFAULT 0,
  graded_by uuid,
  graded_at timestamptz,
  feedback text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trad_exam_answers TO authenticated;
GRANT ALL ON public.trad_exam_answers TO service_role;
ALTER TABLE public.trad_exam_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trad_answer_select" ON public.trad_exam_answers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trad_exam_attempts a
                 WHERE a.id = attempt_id
                   AND (a.student_id = auth.uid()
                        OR public.is_school_admin(a.school_id, auth.uid())
                        OR public.has_school_role(a.school_id, auth.uid(), 'teacher'::member_role))));
CREATE POLICY "trad_answer_insert" ON public.trad_exam_answers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.trad_exam_attempts a
                      WHERE a.id = attempt_id
                        AND a.student_id = auth.uid()
                        AND a.submitted_at IS NULL));
CREATE POLICY "trad_answer_update" ON public.trad_exam_answers FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trad_exam_attempts a
                 WHERE a.id = attempt_id
                   AND ((a.student_id = auth.uid() AND a.submitted_at IS NULL)
                        OR public.is_school_admin(a.school_id, auth.uid())
                        OR public.has_school_role(a.school_id, auth.uid(), 'teacher'::member_role))));
CREATE TRIGGER trad_exam_answers_set_updated_at BEFORE UPDATE ON public.trad_exam_answers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.trad_exam_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  exam_id uuid NOT NULL REFERENCES public.trad_exams(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  attempt_id uuid NOT NULL REFERENCES public.trad_exam_attempts(id) ON DELETE CASCADE UNIQUE,
  mcq_score numeric DEFAULT 0,
  theory_score numeric DEFAULT 0,
  total_score numeric DEFAULT 0,
  max_score numeric DEFAULT 0,
  percentage numeric DEFAULT 0,
  grade text,
  status text NOT NULL DEFAULT 'pending_validation',
  validated_by uuid,
  validated_at timestamptz,
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trad_exam_results TO authenticated;
GRANT ALL ON public.trad_exam_results TO service_role;
ALTER TABLE public.trad_exam_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trad_result_select" ON public.trad_exam_results FOR SELECT TO authenticated
  USING ((student_id = auth.uid() AND released_at IS NOT NULL)
         OR public.is_school_admin(school_id, auth.uid())
         OR public.has_school_role(school_id, auth.uid(), 'teacher'::member_role));
CREATE POLICY "trad_result_admin_write" ON public.trad_exam_results FOR ALL TO authenticated
  USING (public.is_school_admin(school_id, auth.uid())
         OR public.has_school_role(school_id, auth.uid(), 'teacher'::member_role))
  WITH CHECK (public.is_school_admin(school_id, auth.uid())
              OR public.has_school_role(school_id, auth.uid(), 'teacher'::member_role));
CREATE TRIGGER trad_exam_results_set_updated_at BEFORE UPDATE ON public.trad_exam_results
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RPCs ----------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trad_list_student_papers(_school uuid)
RETURNS TABLE (
  exam_id uuid, title text, instructions text, exam_type text, total_marks integer,
  exam_date date, start_time time, duration_minutes integer, venue text,
  status text, attempt_id uuid, attempt_status text, result_released boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN QUERY
  SELECT e.id, e.title, e.instructions, e.exam_type::text, e.total_marks,
         t.exam_date, t.start_time, t.duration_minutes, t.venue,
         CASE
           WHEN now() < (t.exam_date::timestamp + t.start_time) THEN 'upcoming'
           WHEN now() < (t.exam_date::timestamp + t.start_time + make_interval(mins => t.duration_minutes)) THEN 'open'
           ELSE 'closed'
         END,
         a.id, a.status, (r.released_at IS NOT NULL)
  FROM public.trad_exams e
  JOIN public.trad_exam_timetable t ON t.id = e.timetable_id
  JOIN public.class_enrollments ce ON ce.class_id = t.class_id
  LEFT JOIN public.trad_exam_attempts a ON a.exam_id = e.id AND a.student_id = auth.uid()
  LEFT JOIN public.trad_exam_results r ON r.attempt_id = a.id
  WHERE e.school_id = _school
    AND e.published_at IS NOT NULL
    AND ce.student_id = auth.uid()
  ORDER BY t.exam_date, t.start_time;
END $$;

CREATE OR REPLACE FUNCTION public.trad_start_attempt(_exam_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_school uuid; v_class uuid; v_date date; v_start time; v_dur int;
        v_attempt_id uuid; v_in_window boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT e.school_id, t.class_id, t.exam_date, t.start_time, t.duration_minutes
    INTO v_school, v_class, v_date, v_start, v_dur
  FROM public.trad_exams e
  JOIN public.trad_exam_timetable t ON t.id = e.timetable_id
  WHERE e.id = _exam_id AND e.published_at IS NOT NULL;
  IF v_school IS NULL THEN RAISE EXCEPTION 'paper not available'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.class_enrollments
                 WHERE class_id = v_class AND student_id = auth.uid()) THEN
    RAISE EXCEPTION 'not enrolled in this class';
  END IF;
  v_in_window := now() >= (v_date::timestamp + v_start)
              AND now() < (v_date::timestamp + v_start + make_interval(mins => v_dur));
  IF NOT v_in_window THEN RAISE EXCEPTION 'exam window closed'; END IF;
  INSERT INTO public.trad_exam_attempts (school_id, exam_id, student_id)
  VALUES (v_school, _exam_id, auth.uid())
  ON CONFLICT (exam_id, student_id) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_attempt_id;
  RETURN v_attempt_id;
END $$;

CREATE OR REPLACE FUNCTION public.trad_get_attempt_questions(_attempt_id uuid)
RETURNS TABLE (
  q_id uuid, q_position int, q_type text, q_prompt text,
  q_options jsonb, q_marks int, q_image_path text, q_section_id uuid,
  q_selected_index integer, q_text_answer text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_student uuid; v_exam uuid;
BEGIN
  SELECT student_id, exam_id INTO v_student, v_exam
  FROM public.trad_exam_attempts WHERE id = _attempt_id;
  IF v_student IS NULL THEN RAISE EXCEPTION 'attempt not found'; END IF;
  IF v_student <> auth.uid() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT q.id, q.position, q.type::text, q.prompt,
         q.options, q.marks, q.image_path, q.section_id,
         a.selected_index, a.text_answer
  FROM public.trad_exam_questions q
  LEFT JOIN public.trad_exam_answers a
    ON a.question_id = q.id AND a.attempt_id = _attempt_id
  WHERE q.exam_id = v_exam
  ORDER BY q.position;
END $$;

CREATE OR REPLACE FUNCTION public.trad_finalize_result(_attempt_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_school uuid; v_exam uuid; v_student uuid;
        v_mcq numeric; v_theory numeric; v_total numeric; v_max numeric; v_pct numeric; v_grade text;
BEGIN
  SELECT school_id, exam_id, student_id INTO v_school, v_exam, v_student
  FROM public.trad_exam_attempts WHERE id = _attempt_id;
  SELECT COALESCE(SUM(a.marks_awarded) FILTER (WHERE q.type = 'mcq'), 0),
         COALESCE(SUM(a.marks_awarded) FILTER (WHERE q.type = 'theory'), 0)
    INTO v_mcq, v_theory
    FROM public.trad_exam_answers a
    JOIN public.trad_exam_questions q ON q.id = a.question_id
   WHERE a.attempt_id = _attempt_id;
  SELECT COALESCE(SUM(marks), 0) INTO v_max
    FROM public.trad_exam_questions WHERE exam_id = v_exam;
  v_total := v_mcq + v_theory;
  v_pct := CASE WHEN v_max > 0 THEN ROUND((v_total / v_max) * 100, 2) ELSE 0 END;
  v_grade := CASE
    WHEN v_pct >= 75 THEN 'A' WHEN v_pct >= 60 THEN 'B'
    WHEN v_pct >= 50 THEN 'C' WHEN v_pct >= 45 THEN 'D'
    WHEN v_pct >= 40 THEN 'E' ELSE 'F' END;
  UPDATE public.trad_exam_attempts
     SET theory_score = v_theory, total_score = v_total, max_score = v_max,
         percentage = v_pct, status = 'graded'
   WHERE id = _attempt_id;
  INSERT INTO public.trad_exam_results
    (school_id, exam_id, student_id, attempt_id,
     mcq_score, theory_score, total_score, max_score, percentage, grade, status)
  VALUES
    (v_school, v_exam, v_student, _attempt_id,
     v_mcq, v_theory, v_total, v_max, v_pct, v_grade, 'pending_validation')
  ON CONFLICT (attempt_id) DO UPDATE
    SET mcq_score = EXCLUDED.mcq_score, theory_score = EXCLUDED.theory_score,
        total_score = EXCLUDED.total_score, max_score = EXCLUDED.max_score,
        percentage = EXCLUDED.percentage, grade = EXCLUDED.grade, updated_at = now();
END $$;

CREATE OR REPLACE FUNCTION public.trad_submit_attempt(_attempt_id uuid, _auto boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_school uuid; v_exam uuid; v_student uuid; v_submitted timestamptz;
        v_mcq_score numeric := 0; v_theory_max numeric := 0; v_mcq_max numeric := 0;
        v_theory_pending int := 0;
BEGIN
  SELECT school_id, exam_id, student_id, submitted_at
    INTO v_school, v_exam, v_student, v_submitted
  FROM public.trad_exam_attempts WHERE id = _attempt_id FOR UPDATE;
  IF v_school IS NULL THEN RAISE EXCEPTION 'attempt not found'; END IF;
  IF v_student <> auth.uid() AND NOT public.is_school_admin(v_school, auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF v_submitted IS NOT NULL THEN RAISE EXCEPTION 'already submitted'; END IF;

  UPDATE public.trad_exam_answers a
     SET is_correct = (a.selected_index IS NOT NULL AND a.selected_index = q.correct_index),
         marks_awarded = CASE
           WHEN a.selected_index IS NOT NULL AND a.selected_index = q.correct_index THEN q.marks
           ELSE 0 END,
         graded_at = now()
    FROM public.trad_exam_questions q
   WHERE a.question_id = q.id AND a.attempt_id = _attempt_id AND q.type = 'mcq';

  SELECT COALESCE(SUM(a.marks_awarded), 0) INTO v_mcq_score
    FROM public.trad_exam_answers a
    JOIN public.trad_exam_questions q ON q.id = a.question_id
   WHERE a.attempt_id = _attempt_id AND q.type = 'mcq';

  SELECT COALESCE(SUM(q.marks) FILTER (WHERE q.type = 'mcq'), 0),
         COALESCE(SUM(q.marks) FILTER (WHERE q.type = 'theory'), 0)
    INTO v_mcq_max, v_theory_max
    FROM public.trad_exam_questions q WHERE q.exam_id = v_exam;

  SELECT COUNT(*) INTO v_theory_pending
    FROM public.trad_exam_questions q WHERE q.exam_id = v_exam AND q.type = 'theory';

  UPDATE public.trad_exam_attempts
     SET submitted_at = now(),
         status = CASE WHEN v_theory_pending > 0 THEN 'submitted' ELSE 'graded' END,
         mcq_score = v_mcq_score,
         max_score = v_mcq_max + v_theory_max,
         total_score = v_mcq_score
   WHERE id = _attempt_id;

  IF v_theory_pending = 0 THEN
    PERFORM public.trad_finalize_result(_attempt_id);
  END IF;

  RETURN jsonb_build_object(
    'mcq_score', v_mcq_score, 'mcq_max', v_mcq_max,
    'theory_max', v_theory_max, 'theory_pending', v_theory_pending,
    'auto', _auto
  );
END $$;

CREATE OR REPLACE FUNCTION public.trad_grade_theory(_answer_id uuid, _marks numeric, _feedback text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_school uuid; v_attempt uuid; v_qtype text; v_qmarks int;
        v_author uuid; v_remaining int;
BEGIN
  SELECT a.school_id, a.attempt_id, q.type::text, q.marks, e.author_id
    INTO v_school, v_attempt, v_qtype, v_qmarks, v_author
  FROM public.trad_exam_answers a
  JOIN public.trad_exam_questions q ON q.id = a.question_id
  JOIN public.trad_exams e ON e.id = q.exam_id
  WHERE a.id = _answer_id;
  IF v_school IS NULL THEN RAISE EXCEPTION 'answer not found'; END IF;
  IF v_qtype <> 'theory' THEN RAISE EXCEPTION 'only theory answers can be graded manually'; END IF;
  IF NOT (public.is_school_admin(v_school, auth.uid()) OR v_author = auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _marks < 0 OR _marks > v_qmarks THEN RAISE EXCEPTION 'marks out of range (0..%)', v_qmarks; END IF;

  UPDATE public.trad_exam_answers
     SET marks_awarded = _marks, feedback = _feedback,
         graded_by = auth.uid(), graded_at = now()
   WHERE id = _answer_id;

  SELECT COUNT(*) INTO v_remaining
  FROM public.trad_exam_answers a
  JOIN public.trad_exam_questions q ON q.id = a.question_id
  WHERE a.attempt_id = v_attempt AND q.type = 'theory' AND a.graded_at IS NULL;

  IF v_remaining = 0 THEN
    PERFORM public.trad_finalize_result(v_attempt);
  END IF;
  RETURN jsonb_build_object('remaining', v_remaining);
END $$;

CREATE OR REPLACE FUNCTION public.trad_validate_result(_attempt_id uuid, _action text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_school uuid;
BEGIN
  SELECT school_id INTO v_school FROM public.trad_exam_results WHERE attempt_id = _attempt_id;
  IF v_school IS NULL THEN RAISE EXCEPTION 'result not found'; END IF;
  IF NOT public.is_school_admin(v_school, auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _action = 'validate' THEN
    UPDATE public.trad_exam_results
       SET status = 'validated', validated_by = auth.uid(), validated_at = now(),
           released_at = now()
     WHERE attempt_id = _attempt_id;
  ELSIF _action = 'reject' THEN
    UPDATE public.trad_exam_results
       SET status = 'rejected', validated_by = auth.uid(), validated_at = now()
     WHERE attempt_id = _attempt_id;
  ELSE RAISE EXCEPTION 'invalid action %', _action;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.trad_review_paper(_exam_id uuid, _action text, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_school uuid;
BEGIN
  SELECT school_id INTO v_school FROM public.trad_exams WHERE id = _exam_id;
  IF v_school IS NULL THEN RAISE EXCEPTION 'paper not found'; END IF;
  IF NOT public.is_school_admin(v_school, auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _action = 'approve' THEN
    UPDATE public.trad_exams
       SET draft_status = 'approved', approved_by = auth.uid(), approved_at = now(),
           rejection_reason = NULL
     WHERE id = _exam_id;
  ELSIF _action = 'publish' THEN
    UPDATE public.trad_exams
       SET draft_status = 'locked', published_at = now(),
           approved_by = COALESCE(approved_by, auth.uid()),
           approved_at = COALESCE(approved_at, now())
     WHERE id = _exam_id;
  ELSIF _action = 'reject' THEN
    UPDATE public.trad_exams
       SET draft_status = 'draft', rejection_reason = _reason,
           approved_by = NULL, approved_at = NULL
     WHERE id = _exam_id;
  ELSE RAISE EXCEPTION 'invalid action %', _action;
  END IF;
END $$;