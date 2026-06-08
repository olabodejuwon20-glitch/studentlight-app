
CREATE OR REPLACE FUNCTION public.set_subscription_status(_school_id uuid, _action text)
RETURNS TABLE(status text, plan text, current_period_end timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new text;
BEGIN
  IF NOT (public.is_school_admin(_school_id, auth.uid()) OR public.is_super_admin(auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF _action = 'cancel' THEN v_new := 'cancelled';
  ELSIF _action = 'resume' THEN v_new := 'active';
  ELSE RAISE EXCEPTION 'invalid action %', _action;
  END IF;

  UPDATE public.subscriptions s
    SET status = v_new
    WHERE s.school_id = _school_id;

  UPDATE public.schools
    SET status = CASE WHEN v_new = 'cancelled' THEN 'cancelled' ELSE 'active' END
    WHERE id = _school_id;

  RETURN QUERY
    SELECT s.status, s.plan::text, s.current_period_end
    FROM public.subscriptions s
    WHERE s.school_id = _school_id
    LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_subscription_status(uuid, text) TO authenticated;
