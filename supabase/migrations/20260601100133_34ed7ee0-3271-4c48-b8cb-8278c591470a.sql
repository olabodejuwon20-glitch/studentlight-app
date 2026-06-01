
REVOKE EXECUTE ON FUNCTION public.bump_ai_quota(uuid, bigint, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bump_ai_quota(uuid, bigint, numeric) TO service_role;

REVOKE EXECUTE ON FUNCTION public.rollup_topic_mastery() FROM PUBLIC, anon, authenticated;
