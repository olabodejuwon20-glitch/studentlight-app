-- ============================================================
-- Part 2: NGN per-term pricing foundations
-- ============================================================

-- 1. Tier source-of-truth
CREATE TABLE IF NOT EXISTS public.plan_pricing (
  plan text PRIMARY KEY,
  label text NOT NULL,
  term_price_kobo int NOT NULL DEFAULT 0,
  included_students int NOT NULL DEFAULT 0,
  extra_student_kobo int NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plan_pricing TO authenticated, anon;
GRANT ALL ON public.plan_pricing TO service_role;
ALTER TABLE public.plan_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_pricing_read_all" ON public.plan_pricing
  FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "plan_pricing_super_write" ON public.plan_pricing
  FOR ALL TO authenticated
  USING (public.is_super_admin(auth.uid()))
  WITH CHECK (public.is_super_admin(auth.uid()));

INSERT INTO public.plan_pricing (plan, label, term_price_kobo, included_students, extra_student_kobo, sort_order) VALUES
  ('trial',      'Trial',      0,        30,    0,    0),
  ('basic',      'Starter',    4500000,  150,   15000, 1),
  ('standard',   'Growth',     12000000, 500,   12000, 2),
  ('premium',    'Premium',    28000000, 1500,  10000, 3),
  ('enterprise', 'Enterprise', 0,        99999, 0,     4)
ON CONFLICT (plan) DO UPDATE
SET label = EXCLUDED.label,
    term_price_kobo = EXCLUDED.term_price_kobo,
    included_students = EXCLUDED.included_students,
    extra_student_kobo = EXCLUDED.extra_student_kobo,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();

-- 2. Schools: NGN + termly + per-school overrides
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'NGN',
  ADD COLUMN IF NOT EXISTS billing_cycle text NOT NULL DEFAULT 'termly'
    CHECK (billing_cycle IN ('termly','annual')),
  ADD COLUMN IF NOT EXISTS included_students int,
  ADD COLUMN IF NOT EXISTS extra_student_kobo int,
  ADD COLUMN IF NOT EXISTS current_term text,
  ADD COLUMN IF NOT EXISTS term_starts_at date,
  ADD COLUMN IF NOT EXISTS term_ends_at date,
  ADD COLUMN IF NOT EXISTS student_count int NOT NULL DEFAULT 0;

-- Backfill from plan_pricing
UPDATE public.schools s
SET included_students = COALESCE(s.included_students, pp.included_students),
    extra_student_kobo = COALESCE(s.extra_student_kobo, pp.extra_student_kobo)
FROM public.plan_pricing pp
WHERE pp.plan = s.plan::text;

-- Backfill student_count from class_enrollments
UPDATE public.schools s
SET student_count = sub.cnt
FROM (
  SELECT school_id, COUNT(DISTINCT student_id) AS cnt
  FROM public.class_enrollments
  GROUP BY school_id
) sub
WHERE sub.school_id = s.id;

-- 3. Modules: per-term NGN price + legacy mirror trigger
ALTER TABLE public.modules
  ADD COLUMN IF NOT EXISTS term_price_kobo int NOT NULL DEFAULT 0;

-- Seed term_price_kobo from existing monthly_price_cents (≈ same kobo magnitude)
UPDATE public.modules
SET term_price_kobo = COALESCE(monthly_price_cents, 0) * 100
WHERE term_price_kobo = 0;

CREATE OR REPLACE FUNCTION public.modules_sync_legacy_price()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Keep monthly_price_cents as a rough mirror (in cents) of term_price_kobo (in kobo).
  -- Divide by 100 so legacy consumers see a comparable integer magnitude.
  NEW.monthly_price_cents := GREATEST(0, COALESCE(NEW.term_price_kobo, 0) / 100);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_modules_sync_legacy_price ON public.modules;
CREATE TRIGGER trg_modules_sync_legacy_price
  BEFORE INSERT OR UPDATE OF term_price_kobo ON public.modules
  FOR EACH ROW EXECUTE FUNCTION public.modules_sync_legacy_price();

-- 4. school_modules: per-school price override
ALTER TABLE public.school_modules
  ADD COLUMN IF NOT EXISTS term_price_kobo_override int;
