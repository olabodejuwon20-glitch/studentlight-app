
-- ============================================================
-- AI-Native foundation: jobs ledger, approval queue, budgets,
-- student topic mastery rollup
-- ============================================================

-- 1. ai_jobs: every AI call logged for cost, audit, debugging
CREATE TABLE public.ai_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  user_id uuid,
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  model text,
  input jsonb,
  output jsonb,
  prompt_tokens int,
  completion_tokens int,
  total_tokens int,
  cost_usd numeric(10,6),
  latency_ms int,
  error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX ai_jobs_school_created_idx ON public.ai_jobs (school_id, created_at DESC);
CREATE INDEX ai_jobs_user_idx ON public.ai_jobs (user_id, created_at DESC);
CREATE INDEX ai_jobs_kind_idx ON public.ai_jobs (school_id, kind, created_at DESC);

GRANT SELECT ON public.ai_jobs TO authenticated;
GRANT ALL ON public.ai_jobs TO service_role;
ALTER TABLE public.ai_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their school's ai jobs (admin) or own jobs"
  ON public.ai_jobs FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_school_admin(school_id, auth.uid())
  );

-- 2. ai_approvals: every AI-generated artifact awaiting human approval
CREATE TABLE public.ai_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  entity_type text NOT NULL, -- 'question'|'comment'|'parent_message'|'lesson_plan'|'rubric_grade'
  entity_id uuid,            -- nullable: drafts may not yet have a row
  ai_job_id uuid REFERENCES public.ai_jobs(id) ON DELETE SET NULL,
  draft jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending|approved|rejected|sent
  created_by uuid NOT NULL,
  approved_by uuid,
  approved_at timestamptz,
  edits jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ai_approvals_school_status_idx ON public.ai_approvals (school_id, status, created_at DESC);
CREATE INDEX ai_approvals_entity_idx ON public.ai_approvals (entity_type, entity_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_approvals TO authenticated;
GRANT ALL ON public.ai_approvals TO service_role;
ALTER TABLE public.ai_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Teachers and admins can view approvals in their school"
  ON public.ai_approvals FOR SELECT TO authenticated
  USING (
    public.has_school_role(school_id, auth.uid(), 'teacher'::member_role)
    OR public.is_school_admin(school_id, auth.uid())
  );

CREATE POLICY "Teachers and admins can create approvals"
  ON public.ai_approvals FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (public.has_school_role(school_id, auth.uid(), 'teacher'::member_role)
         OR public.is_school_admin(school_id, auth.uid()))
  );

CREATE POLICY "Teachers and admins can update approvals"
  ON public.ai_approvals FOR UPDATE TO authenticated
  USING (
    public.has_school_role(school_id, auth.uid(), 'teacher'::member_role)
    OR public.is_school_admin(school_id, auth.uid())
  );

CREATE TRIGGER ai_approvals_updated_at
  BEFORE UPDATE ON public.ai_approvals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. school_ai_quotas: monthly budget per school
CREATE TABLE public.school_ai_quotas (
  school_id uuid PRIMARY KEY,
  monthly_token_cap bigint NOT NULL DEFAULT 5000000, -- 5M tokens/mo default
  monthly_cost_cap_usd numeric(10,2) NOT NULL DEFAULT 25.00,
  period_start date NOT NULL DEFAULT date_trunc('month', now())::date,
  tokens_used bigint NOT NULL DEFAULT 0,
  cost_used_usd numeric(10,6) NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.school_ai_quotas TO authenticated;
GRANT ALL ON public.school_ai_quotas TO service_role;
ALTER TABLE public.school_ai_quotas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view their school quota"
  ON public.school_ai_quotas FOR SELECT TO authenticated
  USING (public.is_member(school_id, auth.uid()));

-- 4. student_topic_mastery: rollup powering tutor/practice/copilots
CREATE TABLE public.student_topic_mastery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  subject_code text,
  topic text NOT NULL,
  attempts int NOT NULL DEFAULT 0,
  correct int NOT NULL DEFAULT 0,
  ema_mastery numeric(5,4) NOT NULL DEFAULT 0, -- 0..1
  last_attempt_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, subject_code, topic)
);
CREATE INDEX stm_school_student_idx ON public.student_topic_mastery (school_id, student_id);
CREATE INDEX stm_weak_idx ON public.student_topic_mastery (school_id, ema_mastery);

GRANT SELECT ON public.student_topic_mastery TO authenticated;
GRANT ALL ON public.student_topic_mastery TO service_role;
ALTER TABLE public.student_topic_mastery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students see their mastery; teachers/admins see school"
  ON public.student_topic_mastery FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR public.has_school_role(school_id, auth.uid(), 'teacher'::member_role)
    OR public.is_school_admin(school_id, auth.uid())
  );

-- Rollup trigger: when an assessment_results row lands, fold per_topic JSON
-- into the mastery table with a simple EMA (alpha = 0.4).
CREATE OR REPLACE FUNCTION public.rollup_topic_mastery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_topic text;
  v_n int;
  v_mastery numeric;
  v_correct int;
  v_subject text;
  rec jsonb;
BEGIN
  IF NEW.per_topic IS NULL OR jsonb_typeof(NEW.per_topic) <> 'array' THEN
    RETURN NEW;
  END IF;

  FOR rec IN SELECT * FROM jsonb_array_elements(NEW.per_topic) LOOP
    v_topic := rec->>'topic';
    IF v_topic IS NULL OR v_topic = '' THEN CONTINUE; END IF;
    v_n := COALESCE((rec->>'n')::int, 0);
    IF v_n = 0 THEN CONTINUE; END IF;
    v_mastery := COALESCE((rec->>'mastery')::numeric, 0) / 100.0;
    v_correct := round(v_mastery * v_n);
    v_subject := NULL; -- per_topic doesn't carry subject; left null and grouped later

    INSERT INTO public.student_topic_mastery
      (school_id, student_id, subject_code, topic, attempts, correct, ema_mastery, last_attempt_at)
    VALUES
      (NEW.school_id, NEW.student_id, v_subject, v_topic, v_n, v_correct, v_mastery, now())
    ON CONFLICT (student_id, subject_code, topic) DO UPDATE
      SET attempts = public.student_topic_mastery.attempts + EXCLUDED.attempts,
          correct = public.student_topic_mastery.correct + EXCLUDED.correct,
          ema_mastery = round(
            (0.6 * public.student_topic_mastery.ema_mastery + 0.4 * EXCLUDED.ema_mastery)::numeric,
            4
          ),
          last_attempt_at = now(),
          updated_at = now();
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER assessment_results_topic_rollup
  AFTER INSERT OR UPDATE OF per_topic ON public.assessment_results
  FOR EACH ROW EXECUTE FUNCTION public.rollup_topic_mastery();

-- 5. Atomic counter helper for ai-call cost increment
CREATE OR REPLACE FUNCTION public.bump_ai_quota(
  _school_id uuid,
  _tokens bigint,
  _cost numeric
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.school_ai_quotas (school_id, tokens_used, cost_used_usd)
  VALUES (_school_id, _tokens, _cost)
  ON CONFLICT (school_id) DO UPDATE
    SET tokens_used = CASE
          WHEN public.school_ai_quotas.period_start < date_trunc('month', now())::date
          THEN _tokens
          ELSE public.school_ai_quotas.tokens_used + _tokens
        END,
        cost_used_usd = CASE
          WHEN public.school_ai_quotas.period_start < date_trunc('month', now())::date
          THEN _cost
          ELSE public.school_ai_quotas.cost_used_usd + _cost
        END,
        period_start = CASE
          WHEN public.school_ai_quotas.period_start < date_trunc('month', now())::date
          THEN date_trunc('month', now())::date
          ELSE public.school_ai_quotas.period_start
        END,
        updated_at = now();
END;
$$;
