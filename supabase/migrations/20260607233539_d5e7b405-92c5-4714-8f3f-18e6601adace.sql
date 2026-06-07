
-- 1) Per-school weights
CREATE TABLE IF NOT EXISTS public.term_grade_weights (
  school_id uuid PRIMARY KEY REFERENCES public.schools(id) ON DELETE CASCADE,
  ca_pct numeric NOT NULL DEFAULT 30,
  assignment_pct numeric NOT NULL DEFAULT 10,
  exam_pct numeric NOT NULL DEFAULT 60,
  report_pct numeric NOT NULL DEFAULT 0,
  passing_pct numeric NOT NULL DEFAULT 50,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.term_grade_weights TO authenticated;
GRANT ALL ON public.term_grade_weights TO service_role;

ALTER TABLE public.term_grade_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read weights" ON public.term_grade_weights
  FOR SELECT USING (public.is_member(school_id, auth.uid()));
CREATE POLICY "Admins manage weights" ON public.term_grade_weights
  FOR ALL USING (public.is_school_admin(school_id, auth.uid()))
  WITH CHECK (public.is_school_admin(school_id, auth.uid()));

CREATE OR REPLACE FUNCTION public._tgw_check_sum() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF round(coalesce(NEW.ca_pct,0)+coalesce(NEW.assignment_pct,0)+coalesce(NEW.exam_pct,0)+coalesce(NEW.report_pct,0))::int <> 100 THEN
    RAISE EXCEPTION 'Grade weights must sum to 100 (got %)',
      coalesce(NEW.ca_pct,0)+coalesce(NEW.assignment_pct,0)+coalesce(NEW.exam_pct,0)+coalesce(NEW.report_pct,0);
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_tgw_check_sum ON public.term_grade_weights;
CREATE TRIGGER trg_tgw_check_sum BEFORE INSERT OR UPDATE ON public.term_grade_weights
  FOR EACH ROW EXECUTE FUNCTION public._tgw_check_sum();

-- 2) Extend results
ALTER TABLE public.results
  ADD COLUMN IF NOT EXISTS class_id uuid,
  ADD COLUMN IF NOT EXISTS session text,
  ADD COLUMN IF NOT EXISTS ca_score numeric,
  ADD COLUMN IF NOT EXISTS assignment_score numeric,
  ADD COLUMN IF NOT EXISTS exam_score numeric,
  ADD COLUMN IF NOT EXISTS report_score numeric,
  ADD COLUMN IF NOT EXISTS breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS results_unique_term_subject
  ON public.results (school_id, student_id, subject, term, coalesce(session,''));

-- 3) Recompute single term result
CREATE OR REPLACE FUNCTION public.recompute_term_result(
  _school uuid, _student uuid, _subject text, _term text, _session text DEFAULT NULL,
  _class uuid DEFAULT NULL, _report_score numeric DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  w_ca numeric; w_as numeric; w_ex numeric; w_rp numeric;
  ca_sum numeric := 0; ca_max numeric := 0; ca_pct numeric := 0;
  as_pct numeric := 0; as_count int := 0;
  ex_pct numeric := 0;
  rp_pct numeric;
  total numeric := 0;
  letter text;
  v_breakdown jsonb;
  v_result_id uuid;
BEGIN
  IF NOT (public.has_school_role(_school, auth.uid(), 'teacher'::member_role)
       OR public.is_school_admin(_school, auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT ca_pct, assignment_pct, exam_pct, report_pct
    INTO w_ca, w_as, w_ex, w_rp
  FROM public.term_grade_weights WHERE school_id = _school;
  IF w_ca IS NULL THEN
    w_ca := 30; w_as := 10; w_ex := 60; w_rp := 0;
  END IF;

  -- CA (gradebook entries)
  SELECT coalesce(sum(score),0), coalesce(sum(max_score),0)
    INTO ca_sum, ca_max
  FROM public.gradebook_entries
  WHERE school_id = _school AND student_id = _student
    AND subject = _subject AND term = _term;
  IF ca_max > 0 THEN ca_pct := round((ca_sum / ca_max) * 100, 2); END IF;

  -- Assignments (graded submissions, scored fraction of max_score)
  SELECT coalesce(avg((s.score / NULLIF(a.max_score,0)) * 100), 0), count(*)
    INTO as_pct, as_count
  FROM public.assignment_submissions s
  JOIN public.assignments a ON a.id = s.assignment_id
  WHERE s.school_id = _school AND s.student_id = _student
    AND a.subject = _subject AND s.score IS NOT NULL;
  as_pct := round(coalesce(as_pct,0), 2);

  -- Exam: latest submitted attempt for an exam in this term/subject that counts
  SELECT round(ea.score, 2) INTO ex_pct
  FROM public.exam_attempts ea
  JOIN public.exams e ON e.id = ea.exam_id
  WHERE ea.school_id = _school AND ea.student_id = _student
    AND e.subject = _subject AND e.counts_to_results = true
    AND ea.submitted_at IS NOT NULL AND ea.score IS NOT NULL
  ORDER BY ea.submitted_at DESC LIMIT 1;
  ex_pct := coalesce(ex_pct, 0);

  -- Report rubric: explicit param > existing stored value > null
  IF _report_score IS NOT NULL THEN
    rp_pct := _report_score;
  ELSE
    SELECT report_score INTO rp_pct FROM public.results
      WHERE school_id = _school AND student_id = _student
        AND subject = _subject AND term = _term
        AND coalesce(session,'') = coalesce(_session,'');
  END IF;

  total := round(
      (w_ca/100.0) * ca_pct
    + (w_as/100.0) * as_pct
    + (w_ex/100.0) * ex_pct
    + (w_rp/100.0) * coalesce(rp_pct,0)
  , 2);

  letter := CASE
    WHEN total >= 75 THEN 'A1'
    WHEN total >= 70 THEN 'B2'
    WHEN total >= 65 THEN 'B3'
    WHEN total >= 60 THEN 'C4'
    WHEN total >= 55 THEN 'C5'
    WHEN total >= 50 THEN 'C6'
    WHEN total >= 45 THEN 'D7'
    WHEN total >= 40 THEN 'E8'
    ELSE 'F9' END;

  v_breakdown := jsonb_build_object(
    'weights', jsonb_build_object('ca', w_ca, 'assignment', w_as, 'exam', w_ex, 'report', w_rp),
    'ca', jsonb_build_object('sum', ca_sum, 'max', ca_max, 'pct', ca_pct),
    'assignment', jsonb_build_object('avg_pct', as_pct, 'count', as_count),
    'exam', jsonb_build_object('pct', ex_pct),
    'report', jsonb_build_object('pct', rp_pct),
    'total', total,
    'grade', letter,
    'computed_at', now()
  );

  INSERT INTO public.results(
    school_id, student_id, subject, term, session, class_id,
    score, grade, ca_score, assignment_score, exam_score, report_score, breakdown, teacher_id
  ) VALUES (
    _school, _student, _subject, _term, _session, _class,
    total, letter, ca_pct, as_pct, ex_pct, rp_pct, v_breakdown, auth.uid()
  )
  ON CONFLICT (school_id, student_id, subject, term, coalesce(session,''))
  DO UPDATE SET
    score = excluded.score,
    grade = excluded.grade,
    ca_score = excluded.ca_score,
    assignment_score = excluded.assignment_score,
    exam_score = excluded.exam_score,
    report_score = excluded.report_score,
    breakdown = excluded.breakdown,
    class_id = coalesce(excluded.class_id, public.results.class_id),
    teacher_id = excluded.teacher_id,
    updated_at = now()
  RETURNING id INTO v_result_id;

  RETURN jsonb_build_object('result_id', v_result_id, 'total', total, 'grade', letter, 'breakdown', v_breakdown);
END $$;

-- 4) Class-wide recompute
CREATE OR REPLACE FUNCTION public.recompute_term_results_for_class(
  _class uuid, _term text, _session text DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_school uuid; v_count int := 0; sid uuid; subj text;
BEGIN
  SELECT school_id INTO v_school FROM public.classes WHERE id = _class;
  IF v_school IS NULL THEN RAISE EXCEPTION 'class not found'; END IF;
  IF NOT (public.has_school_role(v_school, auth.uid(), 'teacher'::member_role)
       OR public.is_school_admin(v_school, auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR sid IN SELECT student_id FROM public.class_enrollments WHERE class_id = _class LOOP
    FOR subj IN
      SELECT DISTINCT s FROM (
        SELECT subject AS s FROM public.gradebook_entries
          WHERE school_id = v_school AND student_id = sid AND term = _term AND subject IS NOT NULL
        UNION
        SELECT a.subject FROM public.assignment_submissions sub
          JOIN public.assignments a ON a.id = sub.assignment_id
          WHERE sub.school_id = v_school AND sub.student_id = sid AND a.subject IS NOT NULL
        UNION
        SELECT e.subject FROM public.exam_attempts ea
          JOIN public.exams e ON e.id = ea.exam_id
          WHERE ea.school_id = v_school AND ea.student_id = sid AND e.subject IS NOT NULL
                AND e.counts_to_results = true AND ea.submitted_at IS NOT NULL
      ) u WHERE s IS NOT NULL
    LOOP
      PERFORM public.recompute_term_result(v_school, sid, subj, _term, _session, _class, NULL);
      v_count := v_count + 1;
    END LOOP;
  END LOOP;
  RETURN v_count;
END $$;
