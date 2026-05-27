## Next Phase: School Payments & Billing

Turn the current read-only `fees` list into a real billing system where each school designs its own payment types (tuition, PTA, uniform, exam, hostel, transport, excursion…), assigns them to specific students or whole classes, and lets parents/students pay online with a receipt trail.

### Goals

1. Each school can define **custom payment types** (name, default amount, currency, term/session, recurring or one-off, target audience, mandatory vs optional, partial-payment allowed, due date, late fee).
2. Admins can **issue invoices** from a payment type to a single student, a class, a level, or the whole school in one action.
3. Parents and students see a clean **"Pay now"** flow with online checkout, partial payments, and PDF receipts.
4. Admins get a **collections dashboard** (billed / collected / outstanding, per type, per class, per term) and can record offline payments (cash/bank transfer) with proof upload.
5. Optional **payment plans / installments** per invoice.

### What we build

**1. Database (migration)**

New tables (all RLS-scoped to school + role):

- `payment_types` — school-defined catalog. Columns: `school_id`, `name`, `code`, `description`, `category` (tuition/levy/uniform/exam/hostel/transport/other), `default_amount`, `currency` (default NGN), `recurrence` (one_off/termly/sessional/monthly), `term`, `session`, `audience` (school/level/class/custom), `class_id?`, `level?`, `mandatory bool`, `allow_partial bool`, `due_date`, `late_fee_amount`, `active bool`.
- `invoices` (replaces / supersedes `fees` — keep `fees` as a view for back-compat or migrate data). Columns: `school_id`, `payment_type_id`, `student_id`, `parent_id?`, `amount_due`, `amount_paid`, `currency`, `status` (pending/partial/paid/overdue/waived/cancelled), `due_date`, `term`, `session`, `notes`, `issued_by`, `issued_at`.
- `payments` — every payment attempt/settlement. Columns: `invoice_id`, `school_id`, `student_id`, `payer_user_id`, `amount`, `currency`, `method` (paystack/cash/bank_transfer/pos/waiver), `status` (initiated/successful/failed/refunded), `provider_reference`, `provider_payload jsonb`, `proof_url?`, `recorded_by?`, `paid_at`.
- `payment_plans` — optional installment schedule per invoice: `invoice_id`, `installment_no`, `amount`, `due_date`, `status`.
- `school_payment_settings` — per-school: `paystack_subaccount_code?`, `bank_name`, `account_number`, `account_name`, `receipt_footer`, `auto_late_fee bool`, `grace_days`.

Enums extend as needed; add updated_at triggers.

**2. RLS**

- Admins: full CRUD inside their school.
- Teachers: read-only on aggregate for their classes (optional).
- Students: read their own invoices/payments, insert `payments` rows (initiated only) for themselves.
- Parents: read invoices/payments for linked children, insert `payments` for them.
- Super admin: full read for support.

**3. Edge functions**

- `payments-checkout` — create a Paystack transaction for an invoice (returns auth URL + reference). Validates the payer is the student or a linked parent.
- `payments-webhook` — verifies Paystack signature, marks `payments.status = successful`, increments `invoices.amount_paid`, transitions invoice status (`partial`/`paid`), emits a notification to admin + parent + student.
- `payments-record-offline` — admin-only; records cash/bank/POS payments and uploads proof to a new `payment-proofs` storage bucket.
- `issue-invoices` — admin-only; given a `payment_type_id` + audience selector (class / level / student list / whole school), bulk-inserts invoices idempotently for the current term.
- `generate-receipt` — produces a PDF receipt for a successful payment using the school logo + `receipt_footer`.

**4. Storage**

- New private bucket `payment-proofs` (admin upload, school-scoped read).
- Reuse existing PDF generation pattern from `generate-result-slip` for receipts.

**5. Admin UI** (`/:slug/app/admin/fees` becomes a hub)

- Tabs: **Overview**, **Payment Types**, **Invoices**, **Payments**, **Settings**.
- **Payment Types**: table + "New payment type" sheet with all fields above. Inline activate/deactivate, duplicate, edit.
- **Issue invoices** modal from any payment type: audience picker (Whole school / Level / Class / Pick students), preview count + total, confirm.
- **Invoices** table: filters (status, class, term, payment type), bulk actions (mark waived, cancel, send reminder).
- **Payments** table: all settlements; record-offline button; export CSV.
- **Settings**: bank details, Paystack subaccount, receipt footer, auto-late-fee toggle.
- **Overview**: collected vs outstanding cards, line chart by week, top outstanding classes.

**6. Parent & Student UI**

- Existing `parent/Fees.tsx` and `student/Fees.tsx` upgraded:
  - Per-invoice row with **Pay now** (Paystack inline) and **Pay in installments** when allowed.
  - Status badges (Pending / Partial / Paid / Overdue).
  - "Download receipt" on successful payments.
  - History of past payments per child.
- Notification bell entries when a new invoice is issued and when a payment succeeds.

**7. Routing & sidebar**

- Admin sidebar: rename "Fees" to "Fees & Payments".
- No new top-level routes for parents/students; same `/fees` page handles the new model.

**8. Data migration**

- Backfill: existing `public.fees` rows become a default `payment_type` per school ("General Fee") + an `invoice` per row + a `payment` row for any `paid` ones.
- Keep `public.fees` as a view selecting from `invoices` for any unrefactored code paths.

### Technical details

- **Provider**: Paystack (NGN-native, supports Nigerian banks, cards, USSD, transfer). Stored secrets: `PAYSTACK_SECRET_KEY`, `PAYSTACK_WEBHOOK_SECRET`. Webhook URL: edge function public URL.
- **Money**: store amounts in kobo (`bigint`) in `payments` and `invoices.amount_due` to avoid float drift; display layer converts to ₦.
- **Idempotency**: `payments.provider_reference` unique; webhook is safe to retry.
- **Concurrency**: invoice status update wrapped in a `SECURITY DEFINER` function `apply_payment(payment_id)` using `SELECT … FOR UPDATE` on the invoice row.
- **Receipts**: PDF generated on-demand, cached in `payment-proofs/receipts/<invoice_id>.pdf`.
- **File touches**:
  - Migration: 1 file (tables, enums, RLS, triggers, `apply_payment`, `issue_invoices` SQL helper, backfill, `fees` compat view).
  - New: `supabase/functions/payments-checkout`, `payments-webhook`, `payments-record-offline`, `issue-invoices`, `generate-receipt`.
  - New: `src/pages/admin/Payments.tsx` (hub), `src/components/payments/PaymentTypeForm.tsx`, `IssueInvoicesDialog.tsx`, `RecordOfflineDialog.tsx`, `PaystackButton.tsx`.
  - Edited: `src/pages/admin/Fees.tsx` (redirect or merge), `src/pages/parent/Fees.tsx`, `src/pages/student/Fees.tsx`, `src/layouts/AppLayout.tsx` (sidebar label), `src/App.tsx` (route).

### Out of scope this phase

- Subscriptions / auto-debit mandates.
- Multi-currency (NGN only, currency column reserved).
- Scholarships / discount rules engine (use one-off `waived` status + amount override).
- Reconciliation against bank statement files.

### Risk

- Webhook security: signature verification is mandatory; without it anyone can mark invoices paid.
- Backfill of existing `fees` rows must be idempotent and reversible (single migration, transactional).
- Requires user to provide a Paystack secret key before live payments work — test mode works out of the box.

### Decisions to confirm before build

1. **Provider**: Paystack assumed. Switch to Flutterwave or both?
2. **Installments**: include in v1, or ship single-payment first?
3. **Migrate `fees` → `invoices`** fully, or keep both side by side for one release?
