
-- 1. Tables
CREATE TABLE public.mock_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  exam_body TEXT NOT NULL CHECK (exam_body IN ('neco','jamb','both')),
  color TEXT NOT NULL DEFAULT 'hsl(var(--primary))',
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, code)
);

CREATE TABLE public.mock_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  subject_id UUID NOT NULL REFERENCES public.mock_subjects(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  prompt TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_index INTEGER NOT NULL DEFAULT 0,
  explanation TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX mock_questions_subject_idx ON public.mock_questions(subject_id, position);

CREATE TABLE public.mock_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  student_id UUID NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('neco_sim','jamb_sim')),
  duration_minutes INTEGER NOT NULL DEFAULT 150,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  total_score INTEGER,
  total_questions INTEGER,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','submitted','expired'))
);
CREATE INDEX mock_sessions_student_idx ON public.mock_sessions(student_id, started_at DESC);

CREATE TABLE public.mock_session_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.mock_sessions(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.mock_subjects(id),
  sort INTEGER NOT NULL DEFAULT 0,
  score INTEGER NOT NULL DEFAULT 0,
  answered_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE (session_id, subject_id)
);

CREATE TABLE public.mock_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.mock_sessions(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL,
  question_id UUID NOT NULL,
  selected_index INTEGER,
  marked_for_review BOOLEAN NOT NULL DEFAULT false,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, question_id)
);
CREATE INDEX mock_answers_session_idx ON public.mock_answers(session_id, subject_id);

-- 2. RLS
ALTER TABLE public.mock_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_session_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view mock subjects" ON public.mock_subjects FOR SELECT
  USING (public.is_member(school_id, auth.uid()));
CREATE POLICY "Admins manage mock subjects" ON public.mock_subjects FOR ALL
  USING (public.is_school_admin(school_id, auth.uid()))
  WITH CHECK (public.is_school_admin(school_id, auth.uid()));

CREATE POLICY "Members view mock questions" ON public.mock_questions FOR SELECT
  USING (public.is_member(school_id, auth.uid()));
CREATE POLICY "Admins manage mock questions" ON public.mock_questions FOR ALL
  USING (public.is_school_admin(school_id, auth.uid()))
  WITH CHECK (public.is_school_admin(school_id, auth.uid()));

CREATE POLICY "Student owns session" ON public.mock_sessions FOR ALL
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid() AND public.is_member(school_id, auth.uid()));
CREATE POLICY "Staff view sessions" ON public.mock_sessions FOR SELECT
  USING (public.has_school_role(school_id, auth.uid(), 'teacher'::member_role) OR public.is_school_admin(school_id, auth.uid()));

CREATE POLICY "Session owner manages session subjects" ON public.mock_session_subjects FOR ALL
  USING (EXISTS (SELECT 1 FROM public.mock_sessions s WHERE s.id = session_id AND (s.student_id = auth.uid() OR public.is_school_admin(s.school_id, auth.uid()) OR public.has_school_role(s.school_id, auth.uid(),'teacher'::member_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.mock_sessions s WHERE s.id = session_id AND s.student_id = auth.uid()));

CREATE POLICY "Session owner manages answers" ON public.mock_answers FOR ALL
  USING (EXISTS (SELECT 1 FROM public.mock_sessions s WHERE s.id = session_id AND (s.student_id = auth.uid() OR public.is_school_admin(s.school_id, auth.uid()) OR public.has_school_role(s.school_id, auth.uid(),'teacher'::member_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.mock_sessions s WHERE s.id = session_id AND s.student_id = auth.uid()));

-- 3. Seed function
CREATE OR REPLACE FUNCTION public.seed_mock_bank(_school UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  subj_id UUID;
  i INTEGER;
  prompt_txt TEXT;
  opts JSONB;
  correct INT;
  subjects JSONB := '[
    {"code":"math","name":"Mathematics","body":"both","color":"hsl(220 90% 56%)","sort":1},
    {"code":"english","name":"English Language","body":"both","color":"hsl(0 80% 60%)","sort":2},
    {"code":"physics","name":"Physics","body":"both","color":"hsl(190 80% 50%)","sort":3},
    {"code":"chemistry","name":"Chemistry","body":"both","color":"hsl(280 70% 60%)","sort":4},
    {"code":"biology","name":"Biology","body":"both","color":"hsl(140 60% 45%)","sort":5},
    {"code":"economics","name":"Economics","body":"neco","color":"hsl(40 90% 55%)","sort":6},
    {"code":"government","name":"Government","body":"neco","color":"hsl(210 50% 40%)","sort":7},
    {"code":"literature","name":"Literature in English","body":"neco","color":"hsl(330 70% 55%)","sort":8},
    {"code":"crs","name":"Christian Religious Studies","body":"neco","color":"hsl(20 70% 55%)","sort":9},
    {"code":"irs","name":"Islamic Religious Studies","body":"neco","color":"hsl(150 60% 40%)","sort":10},
    {"code":"geography","name":"Geography","body":"neco","color":"hsl(170 70% 40%)","sort":11},
    {"code":"agric","name":"Agricultural Science","body":"neco","color":"hsl(90 60% 45%)","sort":12},
    {"code":"civic","name":"Civic Education","body":"neco","color":"hsl(240 50% 55%)","sort":13},
    {"code":"fmath","name":"Further Mathematics","body":"neco","color":"hsl(260 70% 55%)","sort":14},
    {"code":"commerce","name":"Commerce","body":"neco","color":"hsl(15 80% 55%)","sort":15}
  ]'::jsonb;
BEGIN
  FOR rec IN SELECT * FROM jsonb_to_recordset(subjects) AS x(code TEXT, name TEXT, body TEXT, color TEXT, sort INT) LOOP
    INSERT INTO public.mock_subjects(school_id, code, name, exam_body, color, sort)
    VALUES (_school, rec.code, rec.name, rec.body, rec.color, rec.sort)
    ON CONFLICT (school_id, code) DO UPDATE SET name = EXCLUDED.name, exam_body = EXCLUDED.exam_body, color = EXCLUDED.color, sort = EXCLUDED.sort
    RETURNING id INTO subj_id;

    -- Skip if questions already exist
    IF EXISTS (SELECT 1 FROM public.mock_questions WHERE subject_id = subj_id) THEN
      CONTINUE;
    END IF;

    FOR i IN 1..20 LOOP
      correct := (i % 4);
      IF rec.code = 'math' THEN
        prompt_txt := format('If %sx + %s = %s, what is the value of x?', i+1, i*2, (i+1)*5 + i*2);
        opts := jsonb_build_array((5)::text, (i)::text, (i+2)::text, (i*2)::text);
        correct := 1;
      ELSIF rec.code = 'english' THEN
        prompt_txt := format('Question %s (English): Choose the option that best completes the sentence: "The teacher ___ the students every morning."', i);
        opts := jsonb_build_array('greet','greets','greeting','greeted');
        correct := 1;
      ELSE
        prompt_txt := format('%s — Sample question %s of 20. Which of the following statements is correct about this topic?', rec.name, i);
        opts := jsonb_build_array(
          format('Statement A for Q%s', i),
          format('Statement B for Q%s', i),
          format('Statement C for Q%s', i),
          format('Statement D for Q%s', i)
        );
      END IF;

      INSERT INTO public.mock_questions(school_id, subject_id, position, prompt, options, correct_index, explanation)
      VALUES (_school, subj_id, i, prompt_txt, opts, correct, format('This is the explanation for question %s of %s.', i, rec.name));
    END LOOP;
  END LOOP;
END;
$$;

-- 4. Trigger on schools
CREATE OR REPLACE FUNCTION public.trg_seed_mock_bank()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_mock_bank(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER seed_mock_bank_after_insert
AFTER INSERT ON public.schools
FOR EACH ROW EXECUTE FUNCTION public.trg_seed_mock_bank();

-- 5. Backfill all existing schools
DO $$
DECLARE s RECORD;
BEGIN
  FOR s IN SELECT id FROM public.schools LOOP
    PERFORM public.seed_mock_bank(s.id);
  END LOOP;
END $$;
