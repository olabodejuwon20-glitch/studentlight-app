
-- ============ ENUMS ============
CREATE TYPE public.payment_category AS ENUM ('tuition','levy','uniform','exam','hostel','transport','excursion','book','other');
CREATE TYPE public.payment_recurrence AS ENUM ('one_off','termly','sessional','monthly');
CREATE TYPE public.payment_audience AS ENUM ('school','level','class','custom');
CREATE TYPE public.invoice_status AS ENUM ('pending','partial','paid','overdue','waived','cancelled');
CREATE TYPE public.payment_method AS ENUM ('paystack','cash','bank_transfer','pos','waiver');
CREATE TYPE public.payment_status AS ENUM ('initiated','successful','failed','refunded');

-- ============ PAYMENT TYPES ============
CREATE TABLE public.payment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  description text,
  category public.payment_category NOT NULL DEFAULT 'other',
  default_amount_kobo bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  recurrence public.payment_recurrence NOT NULL DEFAULT 'one_off',
  term text,
  session text,
  audience public.payment_audience NOT NULL DEFAULT 'school',
  class_id uuid,
  level text,
  mandatory boolean NOT NULL DEFAULT true,
  allow_partial boolean NOT NULL DEFAULT true,
  due_date date,
  late_fee_kobo bigint NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payment_types_school ON public.payment_types(school_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_types TO authenticated;
GRANT ALL ON public.payment_types TO service_role;

ALTER TABLE public.payment_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view payment types" ON public.payment_types FOR SELECT
  USING (public.is_member(school_id, auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Admins manage payment types" ON public.payment_types FOR ALL
  USING (public.is_school_admin(school_id, auth.uid()))
  WITH CHECK (public.is_school_admin(school_id, auth.uid()));

CREATE TRIGGER trg_payment_types_updated_at BEFORE UPDATE ON public.payment_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ INVOICES (school-payments-invoices, distinct from billing.invoices) ============
CREATE TABLE public.school_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  payment_type_id uuid REFERENCES public.payment_types(id) ON DELETE SET NULL,
  student_id uuid NOT NULL,
  amount_due_kobo bigint NOT NULL,
  amount_paid_kobo bigint NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  status public.invoice_status NOT NULL DEFAULT 'pending',
  due_date date,
  term text,
  session text,
  notes text,
  issued_by uuid,
  issued_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_school_invoices_school ON public.school_invoices(school_id);
CREATE INDEX idx_school_invoices_student ON public.school_invoices(student_id);
CREATE INDEX idx_school_invoices_status ON public.school_invoices(status);
CREATE UNIQUE INDEX uq_school_invoices_dedupe ON public.school_invoices(school_id, student_id, payment_type_id, COALESCE(term,''), COALESCE(session,''))
  WHERE payment_type_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_invoices TO authenticated;
GRANT ALL ON public.school_invoices TO service_role;

ALTER TABLE public.school_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own/parent/admin invoices" ON public.school_invoices FOR SELECT
  USING (
    student_id = auth.uid()
    OR public.is_school_admin(school_id, auth.uid())
    OR public.is_super_admin(auth.uid())
    OR EXISTS(SELECT 1 FROM public.parent_links pl WHERE pl.school_id=school_invoices.school_id AND pl.parent_user_id=auth.uid() AND pl.student_user_id=school_invoices.student_id)
  );
CREATE POLICY "Admins manage invoices" ON public.school_invoices FOR ALL
  USING (public.is_school_admin(school_id, auth.uid()))
  WITH CHECK (public.is_school_admin(school_id, auth.uid()));

CREATE TRIGGER trg_school_invoices_updated_at BEFORE UPDATE ON public.school_invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PAYMENTS ============
CREATE TABLE public.school_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.school_invoices(id) ON DELETE CASCADE,
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id uuid NOT NULL,
  payer_user_id uuid,
  amount_kobo bigint NOT NULL,
  currency text NOT NULL DEFAULT 'NGN',
  method public.payment_method NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'initiated',
  provider_reference text UNIQUE,
  provider_payload jsonb,
  proof_url text,
  notes text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
CREATE INDEX idx_school_payments_invoice ON public.school_payments(invoice_id);
CREATE INDEX idx_school_payments_school ON public.school_payments(school_id);
CREATE INDEX idx_school_payments_status ON public.school_payments(status);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_payments TO authenticated;
GRANT ALL ON public.school_payments TO service_role;

ALTER TABLE public.school_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own/parent/admin payments" ON public.school_payments FOR SELECT
  USING (
    student_id = auth.uid()
    OR payer_user_id = auth.uid()
    OR public.is_school_admin(school_id, auth.uid())
    OR public.is_super_admin(auth.uid())
    OR EXISTS(SELECT 1 FROM public.parent_links pl WHERE pl.school_id=school_payments.school_id AND pl.parent_user_id=auth.uid() AND pl.student_user_id=school_payments.student_id)
  );
CREATE POLICY "Students/parents initiate payments" ON public.school_payments FOR INSERT
  WITH CHECK (
    payer_user_id = auth.uid()
    AND status = 'initiated'
    AND (
      student_id = auth.uid()
      OR EXISTS(SELECT 1 FROM public.parent_links pl WHERE pl.school_id=school_payments.school_id AND pl.parent_user_id=auth.uid() AND pl.student_user_id=school_payments.student_id)
    )
  );
CREATE POLICY "Admins manage payments" ON public.school_payments FOR ALL
  USING (public.is_school_admin(school_id, auth.uid()))
  WITH CHECK (public.is_school_admin(school_id, auth.uid()));

-- ============ PAYMENT PLANS ============
CREATE TABLE public.payment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.school_invoices(id) ON DELETE CASCADE,
  installment_no int NOT NULL,
  amount_kobo bigint NOT NULL,
  due_date date,
  status public.invoice_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(invoice_id, installment_no)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_plans TO authenticated;
GRANT ALL ON public.payment_plans TO service_role;
ALTER TABLE public.payment_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View payment plans via invoice" ON public.payment_plans FOR SELECT
  USING (EXISTS(SELECT 1 FROM public.school_invoices i WHERE i.id = payment_plans.invoice_id AND (
    i.student_id = auth.uid()
    OR public.is_school_admin(i.school_id, auth.uid())
    OR EXISTS(SELECT 1 FROM public.parent_links pl WHERE pl.school_id=i.school_id AND pl.parent_user_id=auth.uid() AND pl.student_user_id=i.student_id)
  )));
CREATE POLICY "Admins manage payment plans" ON public.payment_plans FOR ALL
  USING (EXISTS(SELECT 1 FROM public.school_invoices i WHERE i.id = payment_plans.invoice_id AND public.is_school_admin(i.school_id, auth.uid())))
  WITH CHECK (EXISTS(SELECT 1 FROM public.school_invoices i WHERE i.id = payment_plans.invoice_id AND public.is_school_admin(i.school_id, auth.uid())));

-- ============ SCHOOL PAYMENT SETTINGS ============
CREATE TABLE public.school_payment_settings (
  school_id uuid PRIMARY KEY REFERENCES public.schools(id) ON DELETE CASCADE,
  paystack_subaccount_code text,
  bank_name text,
  account_number text,
  account_name text,
  receipt_footer text,
  auto_late_fee boolean NOT NULL DEFAULT false,
  grace_days int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.school_payment_settings TO authenticated;
GRANT ALL ON public.school_payment_settings TO service_role;
ALTER TABLE public.school_payment_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read settings" ON public.school_payment_settings FOR SELECT
  USING (public.is_member(school_id, auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "Admins manage settings" ON public.school_payment_settings FOR ALL
  USING (public.is_school_admin(school_id, auth.uid()))
  WITH CHECK (public.is_school_admin(school_id, auth.uid()));
CREATE TRIGGER trg_school_payment_settings_updated_at BEFORE UPDATE ON public.school_payment_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ FUNCTIONS ============

-- Safely apply a successful payment to its invoice
CREATE OR REPLACE FUNCTION public.apply_payment(_payment_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pay RECORD;
  v_inv RECORD;
  v_new_paid bigint;
  v_new_status public.invoice_status;
BEGIN
  SELECT * INTO v_pay FROM public.school_payments WHERE id = _payment_id FOR UPDATE;
  IF v_pay IS NULL THEN RAISE EXCEPTION 'payment not found'; END IF;
  IF v_pay.status <> 'successful' THEN RAISE EXCEPTION 'payment not successful'; END IF;

  SELECT * INTO v_inv FROM public.school_invoices WHERE id = v_pay.invoice_id FOR UPDATE;
  IF v_inv IS NULL THEN RAISE EXCEPTION 'invoice not found'; END IF;

  v_new_paid := v_inv.amount_paid_kobo + v_pay.amount_kobo;
  IF v_new_paid >= v_inv.amount_due_kobo THEN
    v_new_status := 'paid';
  ELSIF v_new_paid > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := v_inv.status;
  END IF;

  UPDATE public.school_invoices
    SET amount_paid_kobo = v_new_paid,
        status = v_new_status,
        updated_at = now()
    WHERE id = v_inv.id;
END $$;

-- Bulk issue invoices for an audience
CREATE OR REPLACE FUNCTION public.issue_invoices_for_audience(_payment_type_id uuid, _student_ids uuid[] DEFAULT NULL)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pt RECORD;
  v_count int := 0;
  v_uid uuid := auth.uid();
  v_ids uuid[];
BEGIN
  SELECT * INTO v_pt FROM public.payment_types WHERE id = _payment_type_id;
  IF v_pt IS NULL THEN RAISE EXCEPTION 'payment type not found'; END IF;
  IF NOT public.is_school_admin(v_pt.school_id, v_uid) THEN RAISE EXCEPTION 'forbidden'; END IF;

  IF _student_ids IS NOT NULL AND array_length(_student_ids, 1) > 0 THEN
    v_ids := _student_ids;
  ELSIF v_pt.audience = 'class' AND v_pt.class_id IS NOT NULL THEN
    SELECT array_agg(student_id) INTO v_ids FROM public.class_enrollments WHERE class_id = v_pt.class_id;
  ELSIF v_pt.audience = 'level' AND v_pt.level IS NOT NULL THEN
    SELECT array_agg(ce.student_id) INTO v_ids
    FROM public.class_enrollments ce JOIN public.classes c ON c.id = ce.class_id
    WHERE c.school_id = v_pt.school_id AND c.grade_level = v_pt.level;
  ELSE
    SELECT array_agg(user_id) INTO v_ids
    FROM public.memberships
    WHERE school_id = v_pt.school_id AND role = 'student' AND status = 'active';
  END IF;

  IF v_ids IS NULL THEN RETURN 0; END IF;

  INSERT INTO public.school_invoices (school_id, payment_type_id, student_id, amount_due_kobo, currency, status, due_date, term, session, issued_by)
  SELECT v_pt.school_id, v_pt.id, sid, v_pt.default_amount_kobo, v_pt.currency, 'pending', v_pt.due_date, v_pt.term, v_pt.session, v_uid
  FROM unnest(v_ids) AS sid
  ON CONFLICT (school_id, student_id, payment_type_id, COALESCE(term,''), COALESCE(session,'')) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END $$;

-- ============ BACKFILL existing fees ============
DO $$
DECLARE
  v_school_id uuid;
  v_pt_id uuid;
BEGIN
  FOR v_school_id IN SELECT DISTINCT school_id FROM public.fees LOOP
    INSERT INTO public.payment_types(school_id, name, code, category, default_amount_kobo, recurrence, audience, mandatory, allow_partial, active)
    VALUES (v_school_id, 'General Fee', 'general-legacy', 'other', 0, 'one_off', 'custom', true, true, true)
    RETURNING id INTO v_pt_id;

    INSERT INTO public.school_invoices(school_id, payment_type_id, student_id, amount_due_kobo, amount_paid_kobo, status, due_date, notes, issued_at)
    SELECT
      f.school_id, v_pt_id, f.student_id,
      (f.amount * 100)::bigint,
      CASE WHEN f.status = 'paid' THEN (f.amount * 100)::bigint ELSE 0 END,
      CASE WHEN f.status = 'paid' THEN 'paid'::public.invoice_status ELSE 'pending'::public.invoice_status END,
      f.due_date, f.description, f.created_at
    FROM public.fees f
    WHERE f.school_id = v_school_id;
  END LOOP;
END $$;

-- ============ STORAGE BUCKET for proofs/receipts ============
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins read payment proofs" ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-proofs' AND EXISTS(
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid() AND m.role = 'admin' AND m.status = 'active'
      AND (storage.foldername(name))[1] = m.school_id::text
  ));
CREATE POLICY "Admins upload payment proofs" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'payment-proofs' AND EXISTS(
    SELECT 1 FROM public.memberships m
    WHERE m.user_id = auth.uid() AND m.role = 'admin' AND m.status = 'active'
      AND (storage.foldername(name))[1] = m.school_id::text
  ));
CREATE POLICY "Student/parent read own receipts" ON storage.objects FOR SELECT
  USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[2] = 'receipts' AND EXISTS(
    SELECT 1 FROM public.school_payments p
    WHERE p.id::text = split_part((storage.foldername(name))[3], '.', 1)
      AND (p.student_id = auth.uid() OR p.payer_user_id = auth.uid()
           OR EXISTS(SELECT 1 FROM public.parent_links pl WHERE pl.school_id=p.school_id AND pl.parent_user_id=auth.uid() AND pl.student_user_id=p.student_id))
  ));
