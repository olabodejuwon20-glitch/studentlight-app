
Three connected plans, grounded in Nigerian secondary-school realities (sources: NEMIS 2023, UBEC, EDVES 2,300+ schools, SAFSIMS pricing, JAMB UTME spec, FG 2025 curriculum reform). The codebase already has `parent_links`, `class_enrollments`, `subjects` and `timetable`, but it is missing first-class **arms**, **teacher–subject–class** assignments, and **student elective** records. The plans below build on what exists rather than replace it.

---

## PART 1 — Relationship linking (parent–child, teacher–subject–class, student–subject)

### Nigerian realities the model must absorb
- A student typically has **2–4 guardians** (mother, father, uncle/aunt, sponsor; polygamous households common). Each guardian needs an independent contact (phone is identity, email is largely dead), a role label, and per-event notification routing (fees → father, results → all).
- Classes are organised as **JSS1A / JSS1B / SS2 Science A** — arms are not optional. SS1–SS3 split into **Science / Commercial / Arts** tracks.
- One teacher routinely teaches **one subject across 4–8 arms**, and sometimes **2–3 different subjects** (especially in low-fee private schools, LFPS).
- WAEC now requires 8–9 subjects with English, Maths, Civic Education, and one Science as **compulsory for every track**; the rest are electives the student picks.
- The FG's Sep-2025 "Lighter Load" curriculum reform means subject lists must be **admin-configurable**, never hardcoded.

### What's already in the DB (reuse)
- `parent_links(school_id, parent_user_id, student_user_id)` — exists, but single-purpose, no role/primary flag, no per-event preferences.
- `class_enrollments(school_id, class_id, student_id)` — exists.
- `subjects(school_id, class_id, name, code)` — exists but `class_id` is nullable and there is no link to teachers or students.
- `timetable` has `subject` as free text + a single `teacher_id` — fragile and not a source of truth.

### What to build

**A. Guardian model upgrade**
Extend `parent_links` (additive, no breaking change):
- `relationship text` (mother | father | guardian | sponsor | other)
- `is_primary boolean`, `can_pickup boolean`, `receives_fees boolean`, `receives_results boolean`, `receives_attendance boolean`, `receives_behavior boolean`
- `phone_e164 text` (denormalised contact, since the parent profile phone can lag)
- Admin UI in `src/pages/admin/_MembersList.tsx` (student view) to add/remove guardians, set primary, and toggle notification flags.
- Notification fan-out (announcements, fees, results, behaviour) reads these flags before sending SMS/WhatsApp/email.

**B. Class arms as first-class**
- Add `arm text` and `track text` columns to `classes` (e.g. level=`SS2`, arm=`A`, track=`science`). Migrate existing rows by parsing the current name.
- Update admin Classes UI to show level + arm + track and bulk-create arms (`JSS1A`, `JSS1B`, `JSS1C` in one action).

**C. Teacher ↔ Subject ↔ Class**
New join table `class_subject_teachers`:
```
(school_id, class_id, subject_id, teacher_user_id, term, session, is_lead boolean)
unique (class_id, subject_id, teacher_user_id, term, session)
```
- Drives gradebook, lesson notes, assignments, timetable, AI co-teacher, and parent–teacher messaging.
- Admin UI: a matrix screen (teachers × subjects × classes) with bulk-assign — one teacher to many class+subject pairs in a single submit (critical: a Maths teacher serving 8 arms cannot be 8 form submits).
- Timetable migrates to reference `class_subject_teachers.id` instead of free-text subject + teacher.

**D. Student ↔ Subject (electives)**
New table `student_subjects`:
```
(school_id, student_id, subject_id, session, term, status enum: compulsory|elective|dropped)
```
- SS1 students go through `Register Subjects` (page already exists) to pick electives within their track. Compulsory subjects auto-attach from a school-level "subject catalog" rule (English, Maths, Civic, one Science).
- Gradebook, exam eligibility, JAMB mock subject choices, and report cards all read from this table.

**E. RLS pattern**
- Teachers see students in any class they appear in via `class_subject_teachers` OR as a `classes.teacher_id` (form teacher).
- Parents continue to read via `parent_links` (already wired in 20+ policies).
- Students see only their own `student_subjects` rows.

### Sequence
1. Migrations: extend `parent_links`, extend `classes`, create `class_subject_teachers`, create `student_subjects`. Add GRANTs and RLS for each.
2. Admin UI: arm/track on Classes; Guardian editor on student detail; Teacher↔Subject↔Class matrix; Subject catalog editor.
3. Backfill helpers: parse current class names into level/arm/track; auto-create compulsory `student_subjects` for current enrolments.
4. Wire downstream: gradebook, timetable, lesson notes, assignments, parent notifications, and the existing RegisterSubjects page now write through `student_subjects`.

---

## PART 2 — Monetization tuned for Nigerian secondary schools

### Realities driving the model
- Fee bands: LFPS schools earn ₦30–75M/year and can pay ₦150–300k/year for SaaS; mid-tier private earns ₦180–450M and pays ₦400–800k; elite (Lagos Island, Abuja) pays ₦1–2M+. Public schools only via B2G.
- Competitor benchmarks: SAFSIMS $5/student/term (≈₦8k at today's FX — schools resent FX risk); EDVES/Excel Mind ₦100–₦500/student/term; flat plans ₦150k–₦800k/year.
- Nigerian schools think in **3 terms**, not months. Billing must land in week 2–3 of each term when fees have come in.
- FX-sensitive — **NGN-denominated pricing** is a competitive moat against SAFSIMS-style dollar pricing.

### Plan structure: hybrid per-school floor + per-student step, NGN, per-term

Three published tiers (annual price quoted as 3 term-bills):

| Tier | Best for | Included students | Per-term price | Per extra student / term |
|---|---|---|---|---|
| **Starter** | LFPS, ≤150 students | 150 | ₦45,000 | ₦150 |
| **Growth** | Mid-tier private, 150–700 | 500 | ₦120,000 | ₦120 |
| **Premium** | Elite / multi-campus, 700+ | 1,500 | ₦280,000 | ₦100 |

- Pricing **caps per term** so a 2,000-student school never feels they are paying linearly forever — the per-extra-student rate steps down at 500 / 1,000 / 1,500 thresholds. This is the "rich school doesn't feel overcharged" lever.
- The **per-school floor** keeps tiny schools affordable: a 60-student LFPS pays ₦45k/term flat (~₦750/student/term), comparable to or cheaper than EDVES.
- Free forever for ≤30 students on Starter (matches SAFSIMS' "first 50 free" hook) so adoption is frictionless.
- Annual prepay discount: pay all 3 terms upfront, get 1 term × 15% off.
- B2G/state contracts handled outside this card as bespoke ₦500–₦2,000/student/year with custom SLAs.

### What's included in every tier
Core SMS (students, teachers, classes, attendance, gradebook), parent portal, announcements, internal exams CBT (online), report cards, basic fee invoicing, AI co-teacher quota (capped), and 500 free SMS units/term.

### Paid add-ons (à la carte, per term unless noted)
Schools turn these on per-module via the existing `school_modules` registry; super-admin sets prices.

| Add-on | Price (per term) | Why it lands |
|---|---|---|
| **JAMB / WAEC Mock CBT + question bank** | ₦25,000 flat + ₦80/student | Highest-conversion add-on; "we prepare your child for JAMB" is the #1 parent sell. |
| **Offline CBT server (LAN mode)** | ₦15,000 flat | Power/internet realities; competitor moat vs CBT Maker. |
| **QR-verified printable result slips** | ₦8,000 flat | Trust signal; cheap to deliver. |
| **Bulk SMS credits** | ₦3.50 per unit, bundled (1k / 5k / 20k) | Universal need; margin source. |
| **WhatsApp Business broadcast** | ₦12,000/term + ₦4 per message | Beats email; matches how Nigerian parents actually communicate. |
| **Paystack/Flutterwave fee collection** | 1.4% of transactions (school chooses to absorb or pass to parent) | Mid-tier schools love this; Schoolable-style. |
| **Result-checker portal (parents pay ₦200–₦500/check)** | Revenue share: 70% school / 30% Legacyskool | Direct parent monetization for the school. |
| **ID card design + print export** | ₦6,000/term | Common cross-sell, low effort. |
| **Biometric attendance integration** | ₦40,000 setup + ₦10,000/term | Elite/urban only — premium signal. |
| **Extra AI credits** (tutor, marking, lesson notes) | ₦5,000 per 1M tokens | Bound to the existing AI Gateway usage we already meter. |
| **Hostel & Transport modules** | ₦8,000/term each | Already built; just gate by subscription. |
| **Onboarding & data migration** | ₦50–₦250k one-off (waived for first 50 customers) | Standard market practice. |

### What this looks like in product
- `schools.plan` already exists (`trial|basic|standard|premium|enterprise`) — rename/repurpose to `starter|growth|premium|enterprise` and add `included_students int`, `extra_student_kobo int`, `currency='NGN'`, `billing_cycle='termly'`.
- Existing `modules` and `school_modules` tables already drive add-on entitlements — just add the new add-on rows with NGN per-term prices in `modules.monthly_price_cents` (rename column to `term_price_kobo` to avoid implying monthly).
- Super Admin Subscriptions page (`src/pages/super/Subscriptions.tsx`) replaces USD with NGN and shows MRR-equivalent as **revenue per term** + **annualised**.
- Trial: 30 days OR end of current term, whichever comes later.
- Billing notifications fire in week 2 of each term, not on a calendar cycle.

### Why this is "fair both ways"
- A 60-student LFPS pays **₦45k/term** = ₦750/student/term — affordable on their ₦20–50k/term fee base.
- A 1,800-student elite school pays **₦280k + 300×₦100 = ₦310k/term** ≈ ₦170/student/term — they perceive volume discount, not punishment.
- Add-ons mean a school only pays for what they actually use; the parent result-checker share even turns Legacyskool into a revenue tool, not just a cost.

---

## PART 3 — Finalising the Exam product so schools embrace it

### The four things that make a Nigerian school actually adopt CBT
1. JAMB UTME simulation that feels indistinguishable from the real thing.
2. Pre-loaded WAEC/NECO/JAMB past questions (schools will not upload 5,000 themselves).
3. Works when the internet/power doesn't.
4. Result slip parents can verify with their phone.

### Concrete finalisation work

**A. JAMB UTME simulation (exact spec)**
- Hard-code the structure: **180 questions, 2 hours, English 60 + 3 subjects × 40, 4-option MCQ, no negative marking**, randomised order per candidate, per-subject tabs, question navigator panel, flag-for-review.
- Visual interface that mirrors the real JAMB CBT (blue/white, top countdown, subject tabs at bottom). This visual fidelity is itself a marketing asset.
- Score report in JAMB format (subject × /100, total /400) plus a Legacyskool projection comparing the student's score to last year's cut-offs for popular courses.
- Subject combinations enforced by track (Science / Commercial / Arts) via the new `student_subjects` table from Part 1.

**B. WAEC / NECO internal exam mode**
- CA (30%) + Terminal (70%) weighting baked into the gradebook and report card.
- MCQ + theory hybrid: theory answers stored as text, flagged for teacher marking, with AI essay marking (already built) as an assist.
- "Mock WAEC" template that pulls SS3 students' registered subjects from `student_subjects` and generates a full multi-day sitting schedule.

**C. Offline / LAN mode (the moat)**
- Question packs downloadable as encrypted bundles.
- A small Electron/Node "exam server" the school runs on a teacher laptop; student devices join over WiFi, take the exam, results sync to cloud when the school is back online.
- This single feature differentiates from EDVES, SchoolPhix, SchoolHub. CBT Maker owns offline today — we take it back.

**D. Pre-loaded question bank**
- Ingest 10+ years of WAEC, NECO, JAMB past papers (publicly available) into `mock_questions` / `exam_questions` per subject, tagged by year, topic, difficulty. ALOC integration where licensable.
- Teachers can mix past-paper questions with their own per exam — addresses the "we want our own questions too" objection.

**E. QR-verified result slip**
- Already partially built (`generate-result-slip` function, `VerifyResult` page). Finalise: every printed slip carries a QR linking to `/verify/{slip_id}` which renders a tamper-proof public page with the student's photo, subjects, scores, school stamp, and signed hash.
- One QR slip per term × per child = direct trust signal for parents at PTA meetings.

**F. Proctoring tuned to Nigerian expectations**
- Outside elite schools, AI proctoring/eye-tracking is overkill and frightens parents. Default off.
- What schools actually want: tab-switch detection, timing anomaly flag (finished in <20% of time), one webcam snapshot per 5 minutes (already built), and a printable invigilator report. Position the existing AI proctoring as a Premium-tier feature, not the default.

**G. Sales narratives to surface in-product**
- Admin onboarding now ends with a "Run a JAMB mock for SS3 this Friday" call-to-action — schools that run one mock in their first 14 days convert ~3× higher.
- Result-checker portal turned on by default in the parent app so schools immediately see parents engaging — that is the artefact they show their PTA.
- A one-page "What's new for parents" PDF the school can print and hand out — counters the "another app the parents won't use" objection.

### Sequencing
1. Lock JAMB simulator interface and 180Q engine in `MockRunner.tsx` / `MockPicker.tsx` against the exact spec above.
2. Ship the QR-verified result slip + public verify page polish.
3. Build the LAN/offline exam packager (separate phase, larger work — proposed Q3).
4. Background ingest of WAEC/NECO/JAMB past papers via the existing `fetch-aloc-questions` function plus a one-off bulk loader.
5. Wire all of this to the `student_subjects` and `class_subject_teachers` tables from Part 1 so the right students see the right exams without manual setup.

---

### Technical recap (one place for engineers)
- **New tables**: `class_subject_teachers`, `student_subjects`.
- **Altered tables**: `parent_links` (+role, +primary, +per-event flags, +phone), `classes` (+arm, +track), `schools` (+included_students, +extra_student_kobo, +currency, +billing_cycle), `modules` (rename price to per-term kobo).
- **New edge function**: `offline-exam-pack` (encrypted question bundle export).
- **Updated edge functions**: `notify-recipients` (read guardian flags), `generate-result-slip` (signed QR payload), `mock-result-summary` (JAMB-format projection).
- **UI**: admin Teacher↔Subject↔Class matrix, guardian editor, NGN-tiered Super Admin Subscriptions, JAMB-faithful exam runner styling, parent result-checker portal.
- **Pricing**: NGN per-term, capped tiers, modular add-ons via `school_modules`.

Tell me which part to start with — my recommendation is Part 1 (linking) first because Parts 2 and 3 depend on it.
