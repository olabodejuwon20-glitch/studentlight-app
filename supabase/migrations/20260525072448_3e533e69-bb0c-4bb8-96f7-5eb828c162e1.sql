
REVOKE EXECUTE ON FUNCTION public.is_school_admin(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_school_role(uuid, uuid, member_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.redeem_invite(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.bootstrap_school_admin() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.prevent_membership_self_escalation() FROM anon, authenticated, public;
