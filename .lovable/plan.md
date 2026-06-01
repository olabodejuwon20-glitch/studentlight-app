# Unified Assessment Engine — Architecture & Migration Plan

Consolidate `exams`, `exam_questions`, `exam_attempts`, `exam_answers`, `mock_sessions`, `mock_questions`, `mock_answers`, `question_bank`, AI assessments, and per-board mocks into **one engine** with one result pipeline and one student surface — without destroying existing data.

---

## 1. System Architecture

```text
                 ┌──────────────────────────────┐
                 │   Teacher / Admin Console    │
                 │  Create → Source → Publish   │
                 └──────────────┬───────────────┘
                                │
                ┌───────────────▼───────────────┐
   AI gen ◄──── │    Assessment Authoring API   │ ────► Question Bank
                │  (status: draft/review/pub)   │
                └───────────────┬───────────────┘
                                │ publish
                ┌───────────────▼───────────────┐
                │       Assessment Engine       │
                │  • delivery (RPC)             │
                │  • proctoring                 │
                │  • autosave                   │
                │  • submit / autograde         │
                └───────────────┬───────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
  Result Engine          Analytics Engine        Student Experience
  (score, grade,         (mastery, trends,       ("My Assessments",
   per-section)           projected JAMB)          review mode)
```

One delivery surface (`/student/assessment/:attemptId`), one author flow (`/teacher/assessment/new`), one review surface (`/student/review/:attemptId`). Per-type **presenters** decorate results without forking the engine.

---

## 2. Database Schema (new, additive)

All tables `school_id uuid not null`, RLS on, GRANTed to `authenticated` + `service_role`.

### `assessments` (replaces `exams` + `mock_sessions` template aspects)
```
id, school_id, created_by, class_id?, title, description,
type            enum('school_test','school_exam','jamb_mock','neco_mock','waec_mock','ai_assessment'),
delivery_mode   enum('proctored','open','practice'),
status          enum('draft','in_review','scheduled','published','archived'),
source          enum('manual','question_bank','ai_generated','mixed'),
config          jsonb,   -- duration, randomize, violation_limit, show_answers,
                          -- per-subject counts, allow_calculator, sections[]
scheduled_at, opens_at, closes_at,
counts_to_results bool, weight numeric,
created_at, updated_at
```

### `assessment_sections` (for multi-subject JAMB/WAEC/NECO)
```
id, assessment_id, school_id, subject_code, title, position,
question_count int, time_limit_min int?,
source_filter jsonb  -- {bank_id, topic, difficulty, year}
```

### `questions` (unified bank + assessment-attached)
```
id, school_id, bank_id?, assessment_id?, section_id?,
type        enum('mcq','multi','short','essay','numeric'),
prompt, options jsonb, correct jsonb,   -- index or set
points int, difficulty enum, topic, subject_code,
exam_body enum('jamb','waec','neco','school','generic')?, year int?,
explanation, media jsonb,
ai_generated bool, approved_by uuid?, approved_at timestamptz,
created_by, created_at
```
Question can live in a bank (`bank_id` set, `assessment_id` null) or be inlined to an assessment, or both (snapshot on publish).

### `question_banks`
```
id, school_id?, scope enum('school','global'), name, exam_body, subject_code,
managed_by uuid?, created_at
```
Global JAMB/WAEC/NECO banks have `school_id = null, scope='global'` and are read-only to teachers.

### `assessment_attempts` (replaces `exam_attempts` + `mock_sessions` runtime)
```
id, school_id, assessment_id, student_id,
started_at, submitted_at, expires_at,
status enum('in_progress','submitted','expired','voided'),
violations int default 0,
question_order uuid[],   -- snapshot for randomization
meta jsonb
```

### `assessment_answers` (replaces `exam_answers` + `mock_answers`)
```
id, attempt_id, question_id, school_id,
selected jsonb,   -- index | indices | text | number
is_correct bool?, points_awarded numeric?,
marked_for_review bool, answered_at
```

### `assessment_results` (materialised per attempt)
```
attempt_id pk, school_id, assessment_id, student_id,
raw_score numeric, max_score numeric, percentage numeric,
grade text, position int?,
per_section jsonb,    -- [{section_id, subject, score, max, %}]
per_topic   jsonb,    -- [{topic, mastery, n}]
presenter   text,     -- 'school_exam'|'jamb'|'ai'|...
projected   jsonb,    -- e.g. {jamb_total: 268}
graded_at
```

### `assessment_violations`
Same shape as today's `exam_violations`, scoped to `attempt_id`.

### Analytics (rollups, materialised or scheduled)
- `student_subject_stats(school_id, student_id, subject, attempts, avg_pct, last_at, mastery)`
- `class_assessment_stats(school_id, class_id, assessment_id, mean, median, p25, p75, n)`
- `topic_mastery(school_id, student_id, topic, exposures, correct, mastery_score)`

All updates fed by an `after insert on assessment_results` trigger calling `public.refresh_assessment_analytics(_attempt)`.

---

## 3. RLS Policies (pattern)

```sql
-- assessments
create policy "members view published"
  on public.assessments for select
  using (status in ('scheduled','published')
         and is_member(school_id, auth.uid()));

create policy "staff view all"
  on public.assessments for select
  using (has_school_role(school_id, auth.uid(), 'teacher')
         or is_school_admin(school_id, auth.uid()));

create policy "staff manage"
  on public.assessments for all
  using (has_school_role(school_id, auth.uid(), 'teacher')
         or is_school_admin(school_id, auth.uid()))
  with check (has_school_role(school_id, auth.uid(), 'teacher')
              or is_school_admin(school_id, auth.uid()));
```

Questions/answers/attempts/results follow the existing pattern (security-definer RPCs `get_assessment_questions_for_attempt`, `get_assessment_review` mirror today's `get_exam_*`/`get_mock_*`). Parents read via `parent_links`. Global question banks: `select` to all `authenticated`; writes restricted to `super_admin`.

**Critical guards** (added on top of current policies):
- Students can only `insert` an attempt for an assessment whose `opens_at <= now() < closes_at` and `status='published'` — enforced in `start_assessment(_assessment_id)` RPC.
- Students never `select` `questions.correct` directly — only via RPCs (the column is excluded from `authenticated` grants by using a view `questions_public`).
- `assessment_results` is `insert/update` by `service_role` only; students `select` own rows; teachers `select` school rows.

---

## 4. Authoring Flow (Teacher)

```
Step 1  Type         → school_test | school_exam | jamb/neco/waec mock | ai_assessment
Step 2  Source       → manual | bank | ai_generated | mixed
Step 3  Blueprint    → sections (subject, count, difficulty mix, time)
Step 4  Build        → editor or bank picker or AI generator (review queue)
Step 5  Settings     → schedule, proctoring, randomize, show answers, weight
Step 6  Preview      → student-eye simulation
Step 7  Publish      → status: scheduled/published
```

Single component `AssessmentBuilder` with type-aware step gating. Existing `TestBuilder.tsx` becomes a thin preset of this builder.

---

## 5. AI Assessment Workflow

```
upload(material) ──► ai-generate-questions (edge fn, Lovable AI Gateway)
                       │ writes rows: questions(ai_generated=true,
                       │   assessment_id=…, approved_by=null,
                       │   status via assessments.status='in_review')
                       ▼
              Teacher Review Queue
       (edit prompt / options / correct / explanation)
                       ▼
              approve_question(id)  → questions.approved_by=auth.uid()
                       ▼
        publish_assessment(id)
          guard: every question.approved_by is not null
```

`publish_assessment` RPC rejects if any attached question has `ai_generated=true and approved_by is null`. AI questions never reach students unapproved.

---

## 6. Question Bank Architecture

```
question_banks(scope, exam_body, subject_code)
   └── questions(bank_id, subject_code, topic, difficulty, year, exam_body)
```

- **Global banks** seeded for JAMB / WAEC / NECO per subject; `scope='global'`.
- **School banks** for internal CA/Exam reuse.
- Mock generator RPC `generate_mock(_school, _exam_body, _subjects[], _per_subject int)` snapshots N random questions per subject into a fresh `assessment` + `assessment_sections` + inline `questions` (so a future bank edit doesn't change a past mock).
- Indexes: `(exam_body, subject_code, year)`, `(bank_id, difficulty)`, GIN on `topic`.

---

## 7. Unified Student Experience

Single page `/app/student/assessments` lists rows from a view:

```sql
create view public.student_assessments_v as
select a.id, a.school_id, a.title, a.type, a.scheduled_at, a.closes_at,
       att.id as attempt_id, att.status as attempt_status, r.percentage
from assessments a
left join assessment_attempts att
  on att.assessment_id = a.id and att.student_id = auth.uid()
left join assessment_results r on r.attempt_id = att.id
where a.status in ('scheduled','published');
```

Cards show a single CTA: **Start / Resume / Review**. Type badge (Test, Exam, JAMB, AI) is cosmetic only. Runner route `/app/student/assessment/:attemptId` replaces both `ExamInterface` and `MockRunner` — same timer, autosave, proctoring, submit pipeline.

---

## 8. Result Engine + Presenters

`submit_assessment(_attempt_id)` (security-definer RPC):
1. Locks attempt, computes per-question correctness via `questions.correct`.
2. Aggregates per-section and per-topic.
3. Writes `assessment_results` with `presenter = assessments.type`.
4. Calls `refresh_assessment_analytics(...)`.

Presenters (frontend):
- `school_exam` → grade letter, term roll-up, class position.
- `jamb_mock` → 4-subject grid, scaled score (e.g. raw → /400), projected total.
- `ai_assessment` → mastery bar per topic, "study this next" list (links into AI Tutor with skill=`quiz_me`).
- `school_test` → simple % + breakdown.

Existing `grade-exam-attempt` edge function becomes a thin wrapper that calls `submit_assessment` then returns the presenter payload.

---

## 9. Migration Strategy (non-destructive)

**Phase 0 — Additive (week 1)**
- Ship migration creating new tables + RLS + RPCs. Old tables untouched.
- Create read-only **compatibility views**:
  - `exams_compat` and `mock_sessions_compat` unioning legacy + new rows so dashboards keep working during cutover.

**Phase 1 — Dual-write (week 2)**
- New authoring writes to `assessments`.
- Old `exams` / `mock_sessions` writes mirrored into `assessments` via triggers.
- Student runner reads from new tables when `assessments.id` exists, else falls back.

**Phase 2 — Backfill (week 3)**
- One-off SQL: insert from `exams` → `assessments` (type='school_exam'/'school_test' inferred from `mode`), copy `exam_questions` → `questions`, `exam_attempts` → `assessment_attempts`, `exam_answers` → `assessment_answers`, recompute `assessment_results`.
- Same for `mock_sessions` (type='jamb_mock' etc. from `mode`).
- Verification queries: row counts, score parity sample (compare legacy `score` vs new `percentage`).

**Phase 3 — Cutover (week 4)**
- Flip student routes to unified surface. Old `/student/mock` and `/student/exam/*` 301 to new runner using legacy→new ID map table `assessment_legacy_map(legacy_kind, legacy_id, assessment_id)`.
- Mark legacy tables read-only via revoking write grants from `authenticated`.

**Phase 4 — Sunset (week 6+)**
- After 30 days clean, drop legacy write triggers. Keep legacy tables for audit (or archive to cold schema `legacy.*`).

Rollback: every phase is reversible because the legacy tables retain their data; toggling a feature flag (`unified_assessments_enabled` in `school_modules.config`) reverts UI to legacy routes.

**Testing**
- Snapshot tests on `submit_assessment` vs `grade-exam-attempt` / `grade_mock_session` for 100 sampled historical attempts (scores must match within ±0).
- E2E: create per type → publish → student attempts → results → review.
- Load: 5k concurrent attempts insert, p95 < 250ms on `assessment_answers` upsert.

---

## 10. Security Review

| Risk | Mitigation |
|---|---|
| Cross-tenant read | All policies gated by `is_member(school_id, auth.uid())`; `school_id` `not null` + check constraint matching parent assessment. |
| Correct answer leak to students | `questions.correct` not granted to `authenticated`; runner uses `get_assessment_questions_for_attempt` view that omits it. |
| Result tampering | `assessment_results` writable only by `service_role`; `submit_assessment` is SECURITY DEFINER and validates attempt ownership + not already submitted. |
| Privilege escalation via membership | Existing `prevent_membership_self_escalation` trigger covers; no new surface. |
| Replay / multi-attempt abuse | Unique `(assessment_id, student_id)` partial index where `status<>'voided'` (configurable per assessment via `config.max_attempts`). |
| AI-generated leaking unreviewed | `publish_assessment` RPC blocks publish when any attached question has `ai_generated and approved_by is null`. |
| Bank exposure | Global banks readable but `correct` still hidden behind RPC; school banks gated by `is_member`. |
| Proctoring bypass | `assessment_violations` insert checks attempt ownership (current pattern preserved). |
| RPC abuse | All new RPCs `SECURITY DEFINER set search_path=public`, explicit ownership/role checks at top, raise on mismatch. |
| Missing GRANTs | Every `CREATE TABLE` in migration paired with `GRANT` block to `authenticated` + `service_role`. |

Linter run after Phase 0 migration to confirm: RLS on every new table, no `using (true)`, no `with check (true)`.

---

## Deliverables order (if approved)

1. Migration: new tables + RLS + RPCs + compat views (Phase 0).
2. `AssessmentBuilder` + AI review queue (teacher).
3. Unified student list + runner + review presenter switch.
4. Backfill script + legacy ID map.
5. Feature-flag flip + cutover + monitoring.

Say the word and I'll start with the Phase 0 migration.
