
REVOKE EXECUTE ON FUNCTION public.seed_mock_bank(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_seed_mock_bank() FROM PUBLIC, anon, authenticated;
