-- Allow anon role to execute the role-check functions used inside RLS policies/views
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_school_admin(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_member(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_school_role(uuid, uuid, public.member_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;