
-- 1) SUPA_rls_policy_always_true: tighten telemetry INSERT policies
DROP POLICY IF EXISTS "anyone records page view" ON public.page_views;
CREATE POLICY "anyone records page view" ON public.page_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "anyone records auth event" ON public.auth_events;
CREATE POLICY "anyone records auth event" ON public.auth_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "anyone records client error" ON public.client_errors;
CREATE POLICY "anyone records client error" ON public.client_errors
  FOR INSERT TO anon, authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- 2) SUPA_public_bucket_allows_listing: remove broad LIST on public buckets.
-- Public URLs still work (buckets remain public=true), but clients can't enumerate.
DROP POLICY IF EXISTS "Avatar public read" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read school-logos" ON storage.objects;
DROP POLICY IF EXISTS "School logos public read" ON storage.objects;

-- 3) security_events_insert_no_policy: add a definer RPC for signed-in users
CREATE OR REPLACE FUNCTION public.log_security_event(_kind text, _detail jsonb DEFAULT '{}'::jsonb, _school_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  INSERT INTO public.security_events (user_id, school_id, kind, detail)
  VALUES (auth.uid(), _school_id, _kind, COALESCE(_detail, '{}'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.log_security_event(text, jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_security_event(text, jsonb, uuid) TO authenticated;

-- 4) SUPA_anon_security_definer_function_executable: revoke EXECUTE from anon
-- for all SECURITY DEFINER functions in public except the explicitly-public ones.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig, p.proname
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace
      AND p.prosecdef = true
      AND p.proname NOT IN ('get_school_by_slug', 'verify_result_slip')
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.sig);
  END LOOP;
END $$;
