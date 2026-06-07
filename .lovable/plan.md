## Goal
Currently CA gradebook entries, assignment submissions, exam attempts, and the published `results` row all live in isolation. We will tie them together so that for every (student, subject, term) we compute **one weighted end-of-term result** that rolls up every component, plus the teacher's report comment.

## End-of-term formula

Per (student, subject, term), the end-of-term score is a **weighted sum out of 100**:

```text
term_total =  CA_weight       × (sum CA scores / sum CA max)
            + Assignment_w    × (avg of graded assignment %)
            + Exam_w          × (latest counts_to_results exam %)
            + Report_w        × (optional rubric score from teacher report)
```

Defaults (configurable per school, must total 100):
- CA / Quiz / Mid-term gradebook entries → **30%**
- Assignments → **10%**
- Exam (final, `counts_to_results=true`) → **60%**
- Report rubric (teacher behaviour/effort score, optional) → **0%** by default

NECO grade (A1…F9) is derived from `term_total` using the existing `src/lib/neco.ts` helpers.

## Database

New migration:

1. `public.term_grade_weights` — one row per school with columns
   `school_id`, `ca_pct`, `assignment_pct`, `exam_pct`, `report_pct`, `passing_pct` (default 50).
   Trigger validates the four percentages sum to 100.
   RLS: admins manage, teachers read.

2. Extend `public.results` with:
   - `class_id uuid` (so a result is anchored to a class for sectional reports),
   - `session text` (e.g. "2025/2026"),
   - `ca_score`, `assignment_score`, `exam_score`, `report_score` numeric (each out of 100, nullable),
   - `breakdown jsonb` storing the full computation snapshot,
   - unique index on `(school_id, student_id, subject, term, session)`.

3. RPC `public.recompute_term_result(_school uuid, _student uuid, _subject text, _term text, _session text)`
   - Security definer, teacher/admin only.
   - Pulls gradebook CA entries, assignment_submissions joined to assignments (matching subject + term), and the latest submitted exam attempt where `exams.subject = _subject` and `exams.counts_to_results = true` in that term.
   - Applies the school's weights, writes/updates the row in `public.results`, stores breakdown JSON, computes grade via SQL CASE matching the NECO scale.

4. RPC `public.recompute_term_results_for_class(_class uuid, _term text, _session text)` — loops every enrolled student × every subject taught in the class and calls the per-student function. Returns count of rows written.

5. Existing `publish_results(_ids, _publish)` continues to gate parent/student visibility.

## Edge function (optional, lightweight)
No new edge function is required — the RPC runs in the DB. The existing `generate-result-slip` will automatically render the new breakdown fields once `results.breakdown` is populated.

## Frontend changes

### Teacher
- `src/pages/teacher/Grading.tsx`: add a third tab **"Term Results"** with class + term + session selectors. Lists every student × subject from the class with computed CA / Assignment / Exam / Report / Total / Grade cells. Buttons: **Recompute** (calls `recompute_term_results_for_class`), **Publish all** / **Unpublish** (calls `publish_results`). Inline edit of report-rubric score per row.
- `src/pages/teacher/Reports.tsx`: link the existing AI report-comment dialog to also save an optional 0–100 rubric score into the matching `results` row.

### Admin
- `src/pages/admin/Settings.tsx`: new **"Grading weights"** card editing `term_grade_weights` (CA / Assignment / Exam / Report sliders) with live "must total 100" validation.
- `src/pages/admin/Reports.tsx`: surface aggregate term-result coverage (% of students with a computed term result this term).

### Student & Parent
- `src/pages/student/Results.tsx` and `src/pages/parent/Results.tsx`: when a row has `breakdown`, render a small four-bar component (CA / Assignment / Exam / Report) under each subject row showing the contribution to the final score.

### Helper
- New `src/lib/termResult.ts` with TypeScript types for `TermBreakdown` and a `formatBreakdown()` helper used by all three views.

## Out of scope (for this part)
- AI-generated report comments stay where they are; only the optional rubric number feeds into results.
- Mock JAMB/NECO sessions (`mock_sessions`) remain practice-only and do **not** roll into the term result.
- No changes to invoicing or payments.

## Files

**Created**
- `supabase/migrations/<ts>_term_results_rollup.sql`
- `src/lib/termResult.ts`

**Edited**
- `src/pages/teacher/Grading.tsx` (new Term Results tab)
- `src/pages/teacher/Reports.tsx` (rubric score field)
- `src/pages/admin/Settings.tsx` (weights card)
- `src/pages/admin/Reports.tsx` (coverage stat)
- `src/pages/student/Results.tsx` (breakdown bars)
- `src/pages/parent/Results.tsx` (breakdown bars)
- `src/integrations/supabase/types.ts` (regenerated after migration)

## Open question
Default weights above are CA 30 / Assignment 10 / Exam 60 / Report 0 — please confirm or supply your school's preferred split before I implement.
