
-- Super admin can read ai_cache across schools
DROP POLICY IF EXISTS "Super reads all ai_cache" ON public.ai_cache;
CREATE POLICY "Super reads all ai_cache"
ON public.ai_cache FOR SELECT
TO authenticated
USING (is_super_admin(auth.uid()));

-- Aggregated stats RPC
CREATE OR REPLACE FUNCTION public.super_ai_cache_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_totals jsonb;
  v_by_kind jsonb;
  v_by_role jsonb;
  v_recent jsonb;
BEGIN
  IF NOT public.is_super_admin(v_uid) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'entries', COUNT(*),
    'total_hits', COALESCE(SUM(hits), 0),
    'tokens_saved', COALESCE(SUM(tokens_saved), 0),
    'cost_saved_usd', COALESCE(SUM(cost_saved_usd), 0)::numeric(14,4),
    'last_used_at', MAX(last_used_at),
    'hit_rate', CASE
      WHEN COALESCE(SUM(hits),0) + COUNT(*) = 0 THEN 0
      ELSE ROUND((SUM(hits)::numeric / (SUM(hits) + COUNT(*))) * 100, 1)
    END
  ) INTO v_totals
  FROM public.ai_cache;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_by_kind FROM (
    SELECT
      kind AS feature,
      COUNT(*) AS entries,
      COALESCE(SUM(hits),0) AS hits,
      COALESCE(SUM(tokens_saved),0) AS tokens_saved,
      ROUND(COALESCE(SUM(cost_saved_usd),0)::numeric, 4) AS cost_saved_usd,
      MAX(last_used_at) AS last_used_at,
      CASE WHEN COALESCE(SUM(hits),0) + COUNT(*) = 0 THEN 0
           ELSE ROUND((SUM(hits)::numeric / (SUM(hits) + COUNT(*))) * 100, 1)
      END AS hit_rate
    FROM public.ai_cache
    GROUP BY kind
    ORDER BY hits DESC NULLS LAST
  ) t;

  -- Role breakdown from ai_jobs cache_hit logs
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_by_role FROM (
    SELECT
      COALESCE(m.role::text, 'unknown') AS role,
      COUNT(*) FILTER (WHERE j.status = 'cache_hit') AS hits,
      COUNT(*) FILTER (WHERE j.status <> 'cache_hit') AS misses,
      CASE WHEN COUNT(*) = 0 THEN 0
           ELSE ROUND((COUNT(*) FILTER (WHERE j.status = 'cache_hit'))::numeric / COUNT(*) * 100, 1)
      END AS hit_rate,
      MAX(j.created_at) FILTER (WHERE j.status = 'cache_hit') AS last_hit_at
    FROM public.ai_jobs j
    LEFT JOIN LATERAL (
      SELECT role FROM public.memberships
      WHERE user_id = j.user_id AND school_id = j.school_id AND status = 'active'
      LIMIT 1
    ) m ON true
    WHERE j.created_at > now() - interval '60 days'
    GROUP BY COALESCE(m.role::text, 'unknown')
    ORDER BY hits DESC
  ) t;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO v_recent FROM (
    SELECT kind AS feature, hits, tokens_saved, last_used_at
    FROM public.ai_cache
    ORDER BY last_used_at DESC
    LIMIT 12
  ) t;

  RETURN jsonb_build_object(
    'totals', v_totals,
    'by_feature', v_by_kind,
    'by_role', v_by_role,
    'recent', v_recent
  );
END $$;

GRANT EXECUTE ON FUNCTION public.super_ai_cache_stats() TO authenticated;

-- Recent auth events RPC with user details
CREATE OR REPLACE FUNCTION public.super_recent_auth_events(_limit integer DEFAULT 200, _event text DEFAULT NULL, _since timestamptz DEFAULT NULL)
RETURNS TABLE(
  id uuid,
  event text,
  user_id uuid,
  school_id uuid,
  session_id text,
  created_at timestamptz,
  full_name text,
  email text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT ae.id, ae.event, ae.user_id, ae.school_id, ae.session_id, ae.created_at,
           p.full_name, p.email
    FROM public.auth_events ae
    LEFT JOIN public.profiles p ON p.id = ae.user_id
    WHERE (_event IS NULL OR ae.event = _event)
      AND (_since IS NULL OR ae.created_at >= _since)
    ORDER BY ae.created_at DESC
    LIMIT LEAST(GREATEST(_limit, 1), 2000);
END $$;

GRANT EXECUTE ON FUNCTION public.super_recent_auth_events(integer, text, timestamptz) TO authenticated;
