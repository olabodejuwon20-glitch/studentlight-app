
-- 1) Fix privilege escalation: remove open self-insert policy on memberships.
--    Membership creation is handled via SECURITY DEFINER redeem_invite(),
--    bootstrap_school_admin() trigger, the join-with-code edge function
--    (service_role), and admin-managed inserts via the existing admin policy.
DROP POLICY IF EXISTS "User can insert self via invite (handled by SECURITY DEFINER fn" ON public.memberships;

-- 2) Fix messages exposure: remove the overly permissive realtime policies.
--    Realtime postgres_changes respects table RLS via the sender/recipient policies.
DROP POLICY IF EXISTS "authenticated can use realtime" ON public.messages;
DROP POLICY IF EXISTS "authenticated can publish realtime" ON public.messages;

-- 3) Fix public exposure of result_verifications snapshots.
--    Remove broad anon/authenticated SELECT and expose verification only
--    via a SECURITY DEFINER RPC that requires the exact verification id.
DROP POLICY IF EXISTS "Anyone can verify a result slip" ON public.result_verifications;
REVOKE SELECT ON public.result_verifications FROM anon;
REVOKE SELECT ON public.result_verifications FROM authenticated;

-- School members and the school admin can still read directly for audit.
CREATE POLICY "School members read verifications"
ON public.result_verifications
FOR SELECT
TO authenticated
USING (public.is_member(school_id, auth.uid()));

GRANT SELECT ON public.result_verifications TO authenticated;

-- Public verification RPC: caller must know the exact verification id (UUID acts as token).
CREATE OR REPLACE FUNCTION public.verify_result_slip(_id uuid)
RETURNS TABLE(snapshot jsonb, created_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rv.snapshot, rv.created_at
  FROM public.result_verifications rv
  WHERE rv.id = _id
$$;

REVOKE ALL ON FUNCTION public.verify_result_slip(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.verify_result_slip(uuid) TO anon, authenticated;
