
CREATE TABLE public.trad_scratch_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0 AND quantity <= 10000),
  price_kobo integer NOT NULL CHECK (price_kobo >= 100),
  max_uses integer NOT NULL DEFAULT 5 CHECK (max_uses BETWEEN 1 AND 50),
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disabled')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trad_scratch_batches TO authenticated;
GRANT ALL ON public.trad_scratch_batches TO service_role;
ALTER TABLE public.trad_scratch_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY tsb_admin_all ON public.trad_scratch_batches
  FOR ALL TO authenticated
  USING (is_school_admin(school_id, auth.uid()))
  WITH CHECK (is_school_admin(school_id, auth.uid()));

CREATE TABLE public.trad_scratch_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.trad_scratch_batches(id) ON DELETE CASCADE,
  serial text NOT NULL UNIQUE,
  pin_hash text NOT NULL,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','sold','used','disabled')),
  buyer_user_id uuid REFERENCES auth.users(id),
  sold_at timestamptz,
  max_uses integer NOT NULL DEFAULT 5,
  use_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX trad_cards_school_status_idx ON public.trad_scratch_cards (school_id, status);
CREATE INDEX trad_cards_buyer_idx ON public.trad_scratch_cards (buyer_user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trad_scratch_cards TO authenticated;
GRANT ALL ON public.trad_scratch_cards TO service_role;
ALTER TABLE public.trad_scratch_cards ENABLE ROW LEVEL SECURITY;
REVOKE SELECT (pin_hash) ON public.trad_scratch_cards FROM authenticated;
CREATE POLICY tsc_admin_all ON public.trad_scratch_cards
  FOR ALL TO authenticated
  USING (is_school_admin(school_id, auth.uid()))
  WITH CHECK (is_school_admin(school_id, auth.uid()));
CREATE POLICY tsc_buyer_read ON public.trad_scratch_cards
  FOR SELECT TO authenticated
  USING (buyer_user_id = auth.uid());

CREATE TABLE public.trad_scratch_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.trad_scratch_batches(id) ON DELETE CASCADE,
  card_id uuid REFERENCES public.trad_scratch_cards(id),
  buyer_user_id uuid NOT NULL REFERENCES auth.users(id),
  amount_kobo integer NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  paystack_reference text UNIQUE,
  status text NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated','paid','failed','refunded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
GRANT SELECT, INSERT, UPDATE ON public.trad_scratch_purchases TO authenticated;
GRANT ALL ON public.trad_scratch_purchases TO service_role;
ALTER TABLE public.trad_scratch_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY tsp_admin_read ON public.trad_scratch_purchases
  FOR SELECT TO authenticated
  USING (is_school_admin(school_id, auth.uid()));
CREATE POLICY tsp_buyer_read ON public.trad_scratch_purchases
  FOR SELECT TO authenticated
  USING (buyer_user_id = auth.uid());

CREATE TABLE public.trad_result_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  result_id uuid NOT NULL REFERENCES public.trad_exam_results(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.trad_scratch_cards(id),
  unlocked_by uuid NOT NULL REFERENCES auth.users(id),
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (result_id, unlocked_by)
);
GRANT SELECT, INSERT ON public.trad_result_unlocks TO authenticated;
GRANT ALL ON public.trad_result_unlocks TO service_role;
ALTER TABLE public.trad_result_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tru_self_read ON public.trad_result_unlocks
  FOR SELECT TO authenticated
  USING (unlocked_by = auth.uid() OR is_school_admin(school_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.trad_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trad_batches_touch BEFORE UPDATE ON public.trad_scratch_batches
FOR EACH ROW EXECUTE FUNCTION public.trad_touch_updated_at();
CREATE TRIGGER trad_cards_touch BEFORE UPDATE ON public.trad_scratch_cards
FOR EACH ROW EXECUTE FUNCTION public.trad_touch_updated_at();

CREATE OR REPLACE FUNCTION public.trad_hash_pin(_pin text, _serial text)
RETURNS text LANGUAGE sql IMMUTABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT encode(sha256(convert_to(_pin || '|' || _serial, 'UTF8')), 'hex')
$$;
REVOKE EXECUTE ON FUNCTION public.trad_hash_pin(text,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.trad_redeem_card(_serial text, _pin text, _result_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_card public.trad_scratch_cards%ROWTYPE;
  v_result public.trad_exam_results%ROWTYPE;
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated'); END IF;

  SELECT * INTO v_result FROM public.trad_exam_results WHERE id = _result_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'result_not_found'); END IF;
  IF v_result.status <> 'validated' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'result_not_validated');
  END IF;

  IF EXISTS (SELECT 1 FROM public.trad_result_unlocks WHERE result_id = _result_id AND unlocked_by = v_user) THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;

  SELECT * INTO v_card FROM public.trad_scratch_cards
    WHERE serial = upper(_serial) AND school_id = v_result.school_id
    FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'invalid_card'); END IF;
  IF v_card.status = 'disabled' THEN RETURN jsonb_build_object('ok', false, 'error', 'card_disabled'); END IF;
  IF v_card.expires_at IS NOT NULL AND v_card.expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'card_expired');
  END IF;
  IF v_card.pin_hash <> public.trad_hash_pin(_pin, v_card.serial) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'wrong_pin');
  END IF;
  IF v_card.use_count >= v_card.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'card_exhausted');
  END IF;

  INSERT INTO public.trad_result_unlocks (school_id, result_id, card_id, unlocked_by)
  VALUES (v_result.school_id, _result_id, v_card.id, v_user);

  UPDATE public.trad_scratch_cards
    SET use_count = use_count + 1,
        status = CASE WHEN use_count + 1 >= max_uses THEN 'used' ELSE status END
    WHERE id = v_card.id;

  RETURN jsonb_build_object('ok', true, 'remaining', v_card.max_uses - (v_card.use_count + 1));
END $$;
REVOKE EXECUTE ON FUNCTION public.trad_redeem_card(text,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trad_redeem_card(text,text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.trad_my_cards()
RETURNS TABLE (
  id uuid, school_id uuid, serial text, status text, max_uses integer,
  use_count integer, expires_at timestamptz, sold_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, school_id, serial, status, max_uses, use_count, expires_at, sold_at
  FROM public.trad_scratch_cards
  WHERE buyer_user_id = auth.uid()
  ORDER BY sold_at DESC NULLS LAST
$$;
GRANT EXECUTE ON FUNCTION public.trad_my_cards() TO authenticated;

CREATE OR REPLACE FUNCTION public.trad_is_result_unlocked(_result_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.trad_result_unlocks
    WHERE result_id = _result_id AND unlocked_by = auth.uid()
  )
$$;
GRANT EXECUTE ON FUNCTION public.trad_is_result_unlocked(uuid) TO authenticated;
