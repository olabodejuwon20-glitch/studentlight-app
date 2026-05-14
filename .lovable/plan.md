## Plan — Three Exam Modes

Introduce a `mode` concept on exams so the platform clearly separates high-stakes simulations, internal school assessments, and risk-free practice.

### 1. The three modes

| Mode | Key | Purpose | Proctoring | Violations | Timer | Result counted |
|---|---|---|---|---|---|---|
| NECO/WAEC Simulation | `neco_sim` | National-exam realism | On (default) | Strict, auto-submit at limit | Fixed, server-authoritative | Yes (separate "Mock" bucket) |
| School Exam / Test | `school` | CA, midterm, terminal exams | Optional (admin choice) | Standard, auto-submit at limit | Fixed | Yes (counts to term results) |
| CBT Practice | `practice` | Self-study, no stakes | Off | **None — no warnings, no auto-submit, no logging** | Optional / soft | No (attempt saved, no score in transcript) |

### 2. Database

Single migration:
- `exams.mode` enum `exam_mode` with values `neco_sim`, `school`, `practice` (default `school`, backfill all existing rows to `school`).
- `exams.counts_to_results` boolean (default true; forced false for `practice`).
- Optional `exams.pass_mark` int (used by NECO sim summary screen).
- Index on `(school_id, mode, status)`.

No changes to `exam_attempts`, `exam_answers`, `exam_violations` — practice mode simply skips writing violations.

### 3. ExamInterface behavior (`src/pages/student/ExamInterface.tsx`)

Branch on `activeExam.mode`:
- `practice`: skip fullscreen request, skip `logViolation` listeners, skip auto-submit on time-up (just show "time elapsed" and let user keep going or submit). Never start webcam. Show a "Practice mode — answers won't affect your results" banner. Show correct answer + explanation immediately after each question is answered.
- `school`: current behavior (fullscreen, violations with limit, optional proctor per `exam.proctored`).
- `neco_sim`: same as school but proctor + randomize default ON, violation limit pulled from `schools.exams_violation_limit`, end screen shows a NECO-style provisional grade card (A1–F9 per subject + aggregate).

### 4. Admin — Exam creation (Test Builder / `src/pages/teacher/TestBuilder.tsx` and admin equivalent)

Add a **Mode** selector at the top with three cards. Selecting a mode locks/unlocks fields:
- `practice`: hides proctor toggle, hides violation limit, hides "counts to results", shows "Show answers after each question" toggle.
- `school`: shows proctor toggle, violation limit, schedule, class.
- `neco_sim`: pre-checks proctor + randomize, exposes "subject paper" picker for the NECO grade card.

### 5. Student-facing surfaces

- `ExamInterface.tsx` exam list grouped into three tabs: **NECO Mock**, **School Exams**, **Practice**. Each tile shows a mode badge.
- New `src/pages/student/Practice.tsx` route + sidebar entry "CBT Practice" — lists practice exams + question-bank-driven quick drills (filter by subject/topic/difficulty using existing `question_bank`).
- Results pages and PDF slip filter to `counts_to_results = true` so practice never appears on the slip.

### 6. Admin / Teacher reporting

- `Reports.tsx` and `Grading.tsx` filter attempts by `mode != 'practice'` for grade computation; add a separate "Practice activity" panel showing engagement (attempts, avg score, top topics) without grading impact.
- Proctoring page already filters by violations — naturally empty for practice.

### Files to create
- `supabase/migrations/<ts>_exam_modes.sql`
- `src/pages/student/Practice.tsx`

### Files to edit
- `src/pages/student/ExamInterface.tsx` (mode-aware lockdown + UI)
- `src/pages/teacher/TestBuilder.tsx` (mode selector + conditional fields)
- `src/pages/admin/Reports.tsx`, `src/pages/teacher/Reports.tsx`, `src/pages/teacher/Grading.tsx` (exclude practice)
- `src/pages/student/Results.tsx`, `src/pages/parent/Results.tsx` (exclude practice)
- `src/layouts/AppLayout.tsx` (sidebar entry for student Practice)
- `supabase/functions/generate-result-slip/index.ts` (filter to counts_to_results)

### Out of scope
- Question-bank-powered adaptive practice generator (can be a follow-up).
- Mode-specific PDF certificate for NECO Mock.
