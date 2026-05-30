UPDATE public.schools
SET settings = COALESCE(settings, '{}'::jsonb) || jsonb_build_object('onboarded_at', to_char(now() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
WHERE settings IS NULL OR settings->>'onboarded_at' IS NULL;