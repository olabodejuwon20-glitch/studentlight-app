
## NGN per-term pricing overhaul (Part 2)

Goal: replace the USD monthly model on the Super Admin Subscriptions page with NGN-denominated, per-term pricing that uses a per-school floor + per-student step (capped per tier), plus à-la-carte add-ons priced per term in NGN.

### Schema changes (additive — no enum churn, no breaking columns)

The existing `plan` enum values (`trial|basic|standard|premium|enterprise`) stay; we relabel them in the UI as Trial → Starter → Growth → Premium → Enterprise. This avoids touching the 20+ places `schools.plan` is read.

1. **`schools`** — add:
   - `currency text not null default 'NGN'`
   - `billing_cycle text not null default 'termly'` (termly | annual)
   - `included_students int not null default 150`
   - `extra_student_kobo int not null default 15000` (₦150)
   - `current_term text` (e.g. `2025/2026-T1`)
   - `term_starts_at date`, `term_ends_at date`

2. **`plan_pricing`** — new table, source of truth for tier defaults so super admin can tune pricing without redeploys.
   ```
   plan text primary key      -- trial|basic|standard|premium|enterprise
   label text not null         -- 'Starter','Growth','Premium','Enterprise'
   term_price_kobo int not null
   included_students int not null
   extra_student_kobo int not null
   sort_order int
   ```
   Seed rows:
   - trial → ₦0 / 30 students / ₦0 extra
   - basic (Starter) → ₦45,000 / 150 / ₦150
   - standard (Growth) → ₦120,000 / 500 / ₦120
   - premium (Premium) → ₦280,000 / 1,500 / ₦100
   - enterprise → ₦0 / 99,999 / ₦0 (bespoke; super admin sets per-school overrides on `schools`)

   RLS: read open to authenticated; write only to super admins.

3. **`modules`** — add `term_price_kobo int not null default 0`. Keep `monthly_price_cents` populated (mirror = `term_price_kobo / 100`) so legacy reads keep working until we remove them later.

4. **`school_modules`** — add `term_price_kobo_override int` (nullable) so a specific school can be discounted per add-on.

5. **Add-on seed rows** (insert into `modules` via the insert tool, not migration):
   - `jamb-mock` ₦25,000 (+ per-student handled in code as `extra_student_kobo`-style; for v1 keep flat)
   - `offline-cbt` ₦15,000
   - `qr-result-slip` ₦8,000
   - `sms-credits` ₦0 (metered separately)
   - `whatsapp-broadcast` ₦12,000
   - `paystack-collection` ₦0 (transaction fee model)
   - `result-checker` ₦0 (revenue share)
   - `id-card-print` ₦6,000
   - `biometric-attendance` ₦10,000
   - `ai-credits` ₦5,000 per bundle
   - `hostel` ₦8,000
   - `transport` ₦8,000

### Code changes

**`src/lib/pricing.ts`** (new):
- `formatNaira(kobo)` → `₦1,234`
- `revenueForSchool({ plan, studentCount, addOns, planPricing })` → returns `{ termKobo, annualKobo, breakdown }`. Implements: `base + max(0, students - included) * extraPerStudent + sum(addOns)`.
- `kobo(naira) / naira(kobo)` helpers.

**`src/pages/super/Subscriptions.tsx`** — rewrite (~200 lines):
- Drop the USD `PLAN_BASE` constant; read `plan_pricing` from DB.
- Metrics row swaps "MRR" for **"Revenue this term"** and **"Annualised (×3)"**, both in NGN. Keep "Paid tenants" / "On trial" / "Renewals < 14d".
- Plan column renders the label from `plan_pricing` (Starter/Growth/Premium) instead of the raw enum.
- Per-row revenue uses the new formula and queries an enrolment count subquery (one extra `select count` per school via a denormalised `schools.student_count` we'll backfill in the same migration).
- "Manage" dialog adds: included_students override, extra_student_kobo override, currency lock (NGN), and a "billing cycle" toggle (termly/annual).
- Date column header changes from "Renews" to "Term ends".

**`src/pages/super/SchoolDetail.tsx`** — the inline subscription editor at line ~158 mirrors the same fields.

**`src/pages/super/Modules.tsx`** — show `term_price_kobo` in NGN, allow super admin to edit it. (Keep monthly_price_cents in sync via DB trigger so other consumers don't break.)

**Public pricing/landing copy** — out of scope for this turn; will come in a follow-up so the schema rolls out first.

### Migration order
1. Schema migration: add columns to `schools` and `modules`/`school_modules`; create `plan_pricing` table with seed pricing; add a trigger that keeps `modules.monthly_price_cents = round(term_price_kobo / 100)` so legacy reads stay valid.
2. Backfill: set `schools.included_students` and `extra_student_kobo` from `plan_pricing` based on current `plan`. Set `currency='NGN'`, `billing_cycle='termly'`.
3. Insert/update add-on `modules` rows with new NGN prices (via the insert tool).
4. Ship the pricing lib + Subscriptions page rewrite + SchoolDetail editor + Modules editor.

### Out of scope (separate turns, by request)
- Public pricing page on the landing site.
- Actually collecting recurring billing (Paystack subscription integration).
- Per-student metered usage on JAMB Mock add-on (flat for v1).
- Module gating enforcement in app sidebar — already lives in `useModules.ts` and doesn't need changes.

Approve and I'll execute.
