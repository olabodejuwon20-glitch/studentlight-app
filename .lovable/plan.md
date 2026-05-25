
# Phase 5 — CBT Ecosystem Polish

Bring `ExamInterface.tsx` to the quality of the uploaded NECO mockup. All current logic (auto-save, server-side grading via `grade-exam-attempt`, violation tracking, fullscreen lockdown, proctoring, seeded shuffle) is preserved — this is a UI/UX upgrade plus one DB column and a few behavior additions.

## What changes

### 1. Three-pane exam shell (matches the mockup)

```text
+--------------------+------------------------------------------+----------------------+
| Left rail (260px)  | Top bar: Subject • Mode • Student • Timer ring • Submit Exam  |
| - School logo+name +------------------------------------------+----------------------+
| - Exam title       |  Single-question view                    | Question Navigator   |
| - "NECO CBT Mode"  |  Question N of M • 1 Mark • Mark review  | 6-col grid of #'s    |
| - Exam Details     |  Prompt (KaTeX rendering for math)       | color-coded states   |
|   • Total Qs       |  A/B/C/D option pills                    | Progress bar         |
|   • Total Marks    |                                          | NECO Time Guide card |
|   • Duration       |  Previous / Next                         |                      |
|   • Start/End time |                                          |                      |
| - Legend           |                                          |                      |
| - End Exam (red)   |                                          |                      |
+--------------------+------------------------------------------+----------------------+
```

- Single-question paging replaces the current scroll-all list. Existing per-question `<li>` markup becomes a single rendered question driven by `current`.
- Left rail is collapsible on `<lg` screens (drawer).
- Right navigator keeps existing answered/current logic and adds "Marked for review" state (amber) + "Current" (indigo) matching the mockup colors.
- Timer becomes a circular ring (SVG) with mm:ss inside; turns destructive under 60s.
- "End Exam" (left rail) opens an early-exit confirm distinct from "Submit Exam" (top bar) which is the normal finish flow.

### 2. Mark for review

- DB: add `marked_for_review boolean not null default false` to `public.exam_answers`.
- UI: checkbox above the question, color in navigator (amber).
- Persisted via the same upsert path already used for `selected_index`.

### 3. Math/rich-text prompts

- Add `katex` + a small `<Math>` renderer that scans `$...$` and `$$...$$` in prompt and option strings. Falls back to plain text when no delimiters present, so existing non-math questions render unchanged.

### 4. Auto-submit on timeout (config-driven)

- Already submits on `left <= 0` for non-practice. Wire to module config `cbt.autoSubmitOnTimeout` (defaults true) — practice mode stays unchanged.

### 5. Reads from module config (Phase 4 hook)

- Use `useModuleConfig(school.id, "cbt")` to drive: `webcamProctoring`, `randomizeQuestions`, `violationLimit`, `showAnswersAfterEach`. Exam-level values still win when set; module config is the school-wide default.
- This wires Phase 4 plumbing without yet building the admin config UI.

### 6. Submitted summary screen

- After submit, render a clean result card inside the exam shell (instead of just a toast + bounce back to list): score, answered/total, time used, "Back to exams" button. Toast still fires.

### 7. Exam picker upgrade (the screen before an attempt starts)

- Replace the current tabs with a grid of exam cards grouped by `mode` (`school` / `neco_sim` / `practice`).
- Each card shows: subject pill, title, duration, question count (sub-select to count), scheduled date, proctored indicator, "Start exam" CTA.

## Files touched

- `src/pages/student/ExamInterface.tsx` — refactor into three sub-components within the same file:
  - `ExamPicker` (list/cards)
  - `ExamShell` (left rail + top bar + right navigator layout)
  - `QuestionView` (single-question + math)
  - keep all existing hooks/state at the top; only render layout changes
- `src/components/exam/Math.tsx` — tiny KaTeX wrapper
- `src/components/exam/TimerRing.tsx` — SVG ring + mm:ss
- `supabase/migrations/<ts>_exam_answers_marked.sql` — add column + index `(attempt_id, marked_for_review)`
- `package.json` — add `katex` + `@types/katex` (small, ~270kb gzipped)

## Out of scope (saved for later phases)

- Admin "Module Config" page for CBT (Phase 4 UI)
- Question bank → exam builder bulk import (already partially exists in `TestBuilder.tsx`)
- Post-submit review mode showing correct answers (depends on `show_answers_after_each` and exam closure rules)

## Risk / safety

- Pure additive DB column with a default; existing rows unaffected.
- Server grader (`grade-exam-attempt`) untouched — still scores from `correct_index`.
- Practice mode and proctoring stay behavior-identical.
- If module config row is missing, defaults from the manifest take over (no breakage for un-provisioned schools).
