
REVOKE EXECUTE ON FUNCTION public.apply_payment(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_payment(uuid) TO service_role;

REVOKE EXECUTE ON FUNCTION public.issue_invoices_for_audience(uuid, uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.issue_invoices_for_audience(uuid, uuid[]) TO authenticated, service_role;
