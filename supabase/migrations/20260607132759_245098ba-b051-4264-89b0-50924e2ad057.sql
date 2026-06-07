
ALTER TABLE public.mock_sessions
  ADD COLUMN IF NOT EXISTS lockdown boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS integrity_events jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS integrity_score integer NOT NULL DEFAULT 100;

-- RPC to append an integrity event safely from the client (student owns the session)
CREATE OR REPLACE FUNCTION public.log_mock_integrity_event(_session_id uuid, _kind text, _detail jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_owner uuid; v_status text; v_penalty int;
BEGIN
  SELECT student_id, status INTO v_owner, v_status FROM public.mock_sessions WHERE id = _session_id;
  IF v_owner IS NULL THEN RAISE EXCEPTION 'session not found'; END IF;
  IF v_owner <> auth.uid() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF v_status IN ('submitted','expired') THEN RETURN; END IF;

  v_penalty := CASE _kind
    WHEN 'tab_blur' THEN 5
    WHEN 'fullscreen_exit' THEN 10
    WHEN 'copy_attempt' THEN 3
    WHEN 'paste_attempt' THEN 3
    WHEN 'context_menu' THEN 2
    WHEN 'devtools' THEN 15
    ELSE 1
  END;

  UPDATE public.mock_sessions
     SET integrity_events = integrity_events || jsonb_build_array(jsonb_build_object(
           'kind', _kind, 'at', now(), 'detail', COALESCE(_detail, '{}'::jsonb)
         )),
         integrity_score = GREATEST(0, integrity_score - v_penalty)
   WHERE id = _session_id;
END $$;

GRANT EXECUTE ON FUNCTION public.log_mock_integrity_event(uuid, text, jsonb) TO authenticated;
