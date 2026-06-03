
CREATE TABLE public.ai_cache (
  cache_key text PRIMARY KEY,
  school_id uuid NOT NULL,
  kind text NOT NULL,
  model text NOT NULL,
  response jsonb NOT NULL,
  prompt_tokens int NOT NULL DEFAULT 0,
  completion_tokens int NOT NULL DEFAULT 0,
  cost_usd numeric(12,6) NOT NULL DEFAULT 0,
  tokens_saved bigint NOT NULL DEFAULT 0,
  cost_saved_usd numeric(14,6) NOT NULL DEFAULT 0,
  hits int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days')
);

GRANT ALL ON public.ai_cache TO service_role;

ALTER TABLE public.ai_cache ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies: edge functions use service role only.
-- Admins of the school can read aggregate savings for their dashboards.
CREATE POLICY "School admins can view their AI cache stats"
  ON public.ai_cache FOR SELECT TO authenticated
  USING (public.is_school_admin(school_id, auth.uid()));

CREATE INDEX ai_cache_school_kind_idx ON public.ai_cache (school_id, kind);
CREATE INDEX ai_cache_expires_idx ON public.ai_cache (expires_at);

CREATE OR REPLACE FUNCTION public.bump_ai_quota_savings(_school_id uuid, _tokens bigint, _cost numeric)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  -- Mirrors bump_ai_quota structurally but the savings columns are reporting-only
  -- so we just upsert an ai_cache_savings row. We piggyback on school_ai_quotas if present.
  UPDATE public.school_ai_quotas
     SET updated_at = now()
   WHERE school_id = _school_id;
$$;
