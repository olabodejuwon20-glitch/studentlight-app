## Multi-Subject NECO/JAMB Mock Exams (UTME-style)

Build a seeded NECO/JAMB mock simulation with subject picker and a UTME-style interface that lets a student switch between their selected subjects in one session.

### What we build

**1. Data model (migration)**
- Extend `exam_mode` enum: add `jamb_sim`.
- New table `mock_subjects` (school_id, code, name, exam_body `neco`|`jamb`, color, sort) — 15 NECO subjects + the JAMB-supported set.
- New table `mock_questions` (school_id, subject_id, prompt, options jsonb, correct_index, explanation, position) — 20 per subject per school.
- New table `mock_sessions` (id, school_id, student_id, mode `neco_sim`|`jamb_sim`, started_at, submitted_at, duration_minutes, total_score, status).
- New table `mock_session_subjects` (session_id, subject_id, score, answered_count) — the chosen subjects (9 for NECO, 4 for JAMB).
- New table `mock_answers` (session_id, subject_id, question_id, selected_index, marked_for_review, answered_at) — per-question answer state, used to resume.
- RLS: students see only own sessions/answers; admins see school-wide; mock_subjects/mock_questions readable by any authenticated user in same school.

**2. Auto-seed per school**
- DB function `seed_mock_bank(school_id)` that idempotently inserts the 15 NECO + JAMB subjects and 20 canned questions per subject (Maths, English, Physics, Chemistry, Biology, Economics, Government, Literature, CRS, IRS, Geography, Agric, Civic, Further Maths, Commerce). Question content is a small curated set per subject (compact JSON in the migration).
- Trigger on `schools` insert calls `seed_mock_bank(new.id)`.
- Migration backfills all existing schools.

**3. Subject picker page** `/:slug/app/student/mock`
- Tabs: NECO Mock (pick 9) / JAMB Mock (pick 4, English compulsory).
- Shows subject cards with subject color + question count.
- "Start session" creates a `mock_sessions` row + `mock_session_subjects` rows, navigates to the runner.
- Lists previous sessions with scores + resume button for in-progress.

**4. UTME-style runner** `/:slug/app/student/mock/:sessionId`
- Top bar: school badge, exam mode, student name, global countdown timer, Submit.
- Left rail: session info (subjects chosen, total questions, duration), legend, End Exam.
- Center: question text with options A/B/C/D, Mark for Review checkbox, Previous/Next.
- Right rail: subject tabs (clickable to switch subject), question navigator grid for current subject with status colors (Answered/Marked/Current/Unanswered), per-subject progress, NECO/JAMB time guide.
- All answers persisted to `mock_answers` on change (debounced upsert).
- Submit aggregates scores per subject and writes totals.
- Mirrors the look from the uploaded reference image, reusing existing semantic tokens.

**5. Practice mode (library-driven)**
- New page `/:slug/app/student/practice` that lists files from the student's library (shared `library` bucket) — own uploads + school resources tagged for practice. Each item opens a lightweight practice viewer (PDF/image/text). No scoring; this is study, not assessment.
- Add link in Student sidebar.

**6. Sidebar & routing**
- Add "NECO/JAMB Mock" and "Practice" entries to Student sidebar.
- Register new routes in `src/App.tsx` inside `RoleGate role="student"`.

### Technical details

- File additions: `src/pages/student/MockPicker.tsx`, `src/pages/student/MockRunner.tsx`, `src/pages/student/Practice.tsx`, `src/lib/mock.ts` (helpers + per-subject question count constants).
- File edits: `src/App.tsx` (routes), `src/layouts/AppLayout.tsx` (sidebar), `src/integrations/supabase/types.ts` auto-updates.
- Migration: enum extension, 5 tables + RLS, seed function with question payload, trigger, backfill, realtime not required.
- Runner saves via upsert on `(session_id, question_id)` unique key.
- JAMB rule: English Language preselected and locked; user picks 3 more.
- NECO rule: max 9, min 4 (so we can still submit a partial mock).
- Total session duration: NECO 2h30m, JAMB 2h. Auto-submit on timeout.
- Out of scope this phase: full proctoring webcam loop on mock runner, AI-generated explanations, importing real past papers — uses the seeded canned bank.

### Risk

- 15 subjects × 20 questions = 300 rows × N schools backfill — fine for typical scale.
- Reuses existing auth, RLS patterns, and design tokens. Existing `exams`/`exam_questions` flow untouched.
