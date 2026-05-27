
-- 1) Drop overly-broad messages policies (sender/recipient policy still allows realtime)
DROP POLICY IF EXISTS "authenticated can use realtime" ON public.messages;
DROP POLICY IF EXISTS "authenticated can publish realtime" ON public.messages;

-- 2) Restrict membership self-update to safe columns only
DROP POLICY IF EXISTS "User updates own membership" ON public.memberships;
CREATE POLICY "User updates own membership safe cols"
ON public.memberships
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND role = (SELECT role FROM public.memberships m WHERE m.id = memberships.id)
  AND status = (SELECT status FROM public.memberships m WHERE m.id = memberships.id)
  AND school_id = (SELECT school_id FROM public.memberships m WHERE m.id = memberships.id)
);
-- Note: trigger prevent_membership_self_escalation provides defense-in-depth

-- 3) Tighten school_payment_settings SELECT to admins/super only
DROP POLICY IF EXISTS "Members read settings" ON public.school_payment_settings;
CREATE POLICY "Admins read payment settings"
ON public.school_payment_settings
FOR SELECT
USING (is_school_admin(school_id, auth.uid()) OR is_super_admin(auth.uid()));
