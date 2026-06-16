-- 1) Move vector extension out of public schema
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'vector' AND n.nspname = 'public'
  ) THEN
    EXECUTE 'ALTER EXTENSION vector SET SCHEMA extensions';
  END IF;
END $$;

-- Ensure any SECURITY DEFINER function that touches vectors still resolves the type/operators
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('match_knowledge_chunks')
  LOOP
    EXECUTE format(
      'ALTER FUNCTION %I.%I(%s) SET search_path = public, extensions',
      r.nspname, r.proname, r.args
    );
  END LOOP;
END $$;

-- 2) Revoke EXECUTE from authenticated for trigger-only and internal helper SECURITY DEFINER functions.
--    These are invoked by triggers (run as owner) or are admin/cron-only; clients should never call them.
DO $$
DECLARE
  fn text;
  args text;
  trig_fns text[] := ARRAY[
    'handle_new_user',
    'bootstrap_school_admin',
    'prevent_membership_self_escalation',
    'rollup_topic_mastery',
    'trg_seed_mock_bank',
    'seed_mock_bank',
    'bump_ai_quota',
    'bump_ai_quota_savings',
    'issue_invoices_for_audience',
    'recompute_term_results_for_class',
    'trad_finalize_result'
  ];
BEGIN
  FOREACH fn IN ARRAY trig_fns LOOP
    FOR args IN
      SELECT pg_get_function_identity_arguments(p.oid)
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fn
    LOOP
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated', fn, args);
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role', fn, args);
    END LOOP;
  END LOOP;
END $$;