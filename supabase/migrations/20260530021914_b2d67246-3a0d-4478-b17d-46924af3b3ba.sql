REVOKE ALL ON FUNCTION public.verify_result_slip(uuid) FROM public;
REVOKE ALL ON FUNCTION public.verify_result_slip(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.verify_result_slip(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.verify_result_slip(uuid) TO service_role;