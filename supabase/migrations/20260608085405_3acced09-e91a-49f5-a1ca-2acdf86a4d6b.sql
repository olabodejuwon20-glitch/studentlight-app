
-- Extend invoices for subscription billing
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'subscription',
  ADD COLUMN IF NOT EXISTS plan text,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'NGN',
  ADD COLUMN IF NOT EXISTS amount_kobo integer,
  ADD COLUMN IF NOT EXISTS paystack_reference text,
  ADD COLUMN IF NOT EXISTS paystack_authorization_url text,
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end date,
  ADD COLUMN IF NOT EXISTS due_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_method text,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS invoices_paystack_ref_uniq ON public.invoices(paystack_reference) WHERE paystack_reference IS NOT NULL;
CREATE INDEX IF NOT EXISTS invoices_school_status_idx ON public.invoices(school_id, status, issued_at DESC);

-- Backfill amount_kobo where missing (treat existing amount_cents as kobo for NGN tenants)
UPDATE public.invoices SET amount_kobo = amount_cents WHERE amount_kobo IS NULL;

-- Extend subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS period_start timestamptz,
  ADD COLUMN IF NOT EXISTS paystack_reference text,
  ADD COLUMN IF NOT EXISTS last_invoice_id uuid;

-- Allow school admins to read their own subscription invoices (already in policy) and INSERT via RPC only.
-- Add a policy so service_role can update invoices (it already can via bypass, but explicit is good).
DROP POLICY IF EXISTS "admin can read own invoices" ON public.invoices;
CREATE POLICY "admin can read own invoices" ON public.invoices
  FOR SELECT USING (
    public.is_school_admin(school_id, auth.uid()) OR public.is_super_admin(auth.uid())
  );

-- RPC: create a subscription invoice for a school's chosen plan & cycle
CREATE OR REPLACE FUNCTION public.create_subscription_invoice(_school_id uuid, _plan text, _cycle text DEFAULT 'termly')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_tier RECORD;
  v_school RECORD;
  v_students int;
  v_extra int;
  v_base_kobo int;
  v_extra_kobo int;
  v_addons_kobo int := 0;
  v_total_kobo int;
  v_multiplier int;
  v_period_start date := current_date;
  v_period_end date;
  v_inv_id uuid;
  v_num text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT (public.is_school_admin(_school_id, v_uid) OR public.is_super_admin(v_uid)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_tier FROM public.plan_pricing WHERE plan = _plan;
  IF v_tier IS NULL THEN RAISE EXCEPTION 'unknown plan %', _plan; END IF;

  SELECT * INTO v_school FROM public.schools WHERE id = _school_id;
  IF v_school IS NULL THEN RAISE EXCEPTION 'school not found'; END IF;

  v_students := COALESCE(v_school.student_count, 0);
  v_extra := GREATEST(0, v_students - COALESCE(v_school.included_students, v_tier.included_students));
  v_base_kobo := v_tier.term_price_kobo;
  v_extra_kobo := v_extra * COALESCE(v_school.extra_student_kobo, v_tier.extra_student_kobo);

  -- Sum enabled add-on modules
  SELECT COALESCE(SUM(COALESCE(sm.term_price_kobo_override, m.term_price_kobo)), 0)
    INTO v_addons_kobo
  FROM public.school_modules sm
  JOIN public.modules m ON m.id = sm.module_id
  WHERE sm.school_id = _school_id AND sm.enabled = true;

  v_total_kobo := v_base_kobo + v_extra_kobo + v_addons_kobo;
  v_multiplier := CASE WHEN _cycle = 'annual' THEN 3 ELSE 1 END;
  v_total_kobo := v_total_kobo * v_multiplier;

  v_period_end := v_period_start + (CASE WHEN _cycle = 'annual' THEN interval '365 days' ELSE interval '120 days' END);
  v_num := 'SUB-' || to_char(now(),'YYMMDD') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6);

  INSERT INTO public.invoices(
    school_id, number, amount_cents, amount_kobo, currency, status,
    kind, plan, period_start, period_end, due_at, line_items, metadata
  ) VALUES (
    _school_id, v_num, v_total_kobo, v_total_kobo, COALESCE(v_school.currency,'NGN'), 'open',
    'subscription', _plan, v_period_start, v_period_end, now() + interval '14 days',
    jsonb_build_array(
      jsonb_build_object('description', v_tier.label || ' base (' || _cycle || ')', 'amount_kobo', v_base_kobo * v_multiplier),
      jsonb_build_object('description', v_extra || ' extra students', 'amount_kobo', v_extra_kobo * v_multiplier),
      jsonb_build_object('description', 'Add-on modules', 'amount_kobo', v_addons_kobo * v_multiplier)
    ),
    jsonb_build_object('cycle', _cycle, 'students', v_students)
  )
  RETURNING id INTO v_inv_id;

  RETURN v_inv_id;
END $$;

REVOKE ALL ON FUNCTION public.create_subscription_invoice(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_subscription_invoice(uuid, text, text) TO authenticated;

-- RPC for webhook (service_role) to apply a paid subscription invoice
CREATE OR REPLACE FUNCTION public.apply_subscription_payment(_invoice_id uuid, _reference text, _method text DEFAULT 'paystack')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_inv RECORD; v_school RECORD;
BEGIN
  SELECT * INTO v_inv FROM public.invoices WHERE id = _invoice_id FOR UPDATE;
  IF v_inv IS NULL THEN RAISE EXCEPTION 'invoice not found'; END IF;
  IF v_inv.status = 'paid' THEN RETURN jsonb_build_object('ok', true, 'already', true); END IF;

  UPDATE public.invoices
     SET status = 'paid', paid_at = now(),
         paystack_reference = COALESCE(_reference, paystack_reference),
         paid_method = _method
   WHERE id = _invoice_id;

  IF v_inv.kind = 'subscription' AND v_inv.plan IS NOT NULL THEN
    SELECT * INTO v_school FROM public.schools WHERE id = v_inv.school_id;
    UPDATE public.schools
       SET plan = v_inv.plan::school_plan,
           status = 'active'::school_status,
           plan_started_at = COALESCE(v_inv.period_start::timestamptz, now()),
           plan_expires_at = GREATEST(COALESCE(plan_expires_at, now()), v_inv.period_end::timestamptz),
           term_ends_at = v_inv.period_end
     WHERE id = v_inv.school_id;

    INSERT INTO public.subscriptions(
      school_id, plan, status, started_at, current_period_end,
      monthly_amount_cents, paystack_reference, last_invoice_id, period_start
    ) VALUES (
      v_inv.school_id, v_inv.plan::school_plan, 'active',
      now(), v_inv.period_end::timestamptz,
      v_inv.amount_kobo, _reference, v_inv.id, v_inv.period_start::timestamptz
    );
  END IF;

  RETURN jsonb_build_object('ok', true, 'invoice_id', _invoice_id);
END $$;

REVOKE ALL ON FUNCTION public.apply_subscription_payment(uuid, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.apply_subscription_payment(uuid, text, text) TO service_role;
