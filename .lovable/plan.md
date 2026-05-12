# Phase 3 — NECO Digital Exam Readiness

Goal: turn EduSmart into the obvious choice for secondary schools preparing for Nigeria's NECO digital (CBT) transition. Every feature below is real (DB-backed, RLS-protected), wired to live data, and usable on day one — no mock values.

## 1. Secure CBT Exam Runner (extends `student/ExamInterface.tsx`)
- Fullscreen lock on start; auto-submit on exit attempt.
- Tab/window blur detection — logs `exam_violations` row, warns student, auto-submits after N violations (school setting).
- Disable copy/paste, right-click, dev-tools shortcuts on the exam page.
- Server-side timer: `exam_attempts.started_at` + `exams.duration_min`; client just displays, server rejects late submissions.
- Per-student randomized question order (seeded by `attempt_id`).
- Autosave each answer on change to `exam_answers` so power loss does not lose progress.

## 2. Proctoring Lite
- Webcam permission prompt before exam start (optional flag on exam).
- Snapshot every 30s into private `proctor-snapshots` bucket at `{exam_id}/{attempt_id}/{ts}.jpg`.
- New page `admin/Proctoring.tsx` to review flagged attempts (multiple faces / no face / tab switches).

## 3. Question Bank + NECO-style Import
- New tables: `question_bank` (subject, topic, difficulty, type, body, options jsonb, answer, explanation) and `question_tags`.
- Admin page `admin/QuestionBank.tsx`: filter, search, manual add, CSV/JSON bulk import (uses existing bulk-onboard pattern).
- Teacher `TestBuilder.tsx` upgrade: pick from bank by subject/topic/difficulty, auto-generate N random questions, save as exam.
- Seed script (admin-triggered) to import a starter pack of NECO-style past questions per subject.

## 4. NECO-aligned Analytics
- `student/Analytics.tsx`: predicted NECO grade per subject (weighted rolling avg of last 5 results), weakness heatmap by topic (joined through `question_bank.topic`).
- `teacher/Analytics.tsx`: class mastery per topic, students at risk list.
- `parent/Dashboard.tsx`: add "Predicted NECO grade" card per child.
- AI Tutor: pull weakest 3 topics from analytics and pre-seed the chat ("Let's practice Quadratic Equations — your weakest topic").

## 5. Printable Result Slips (PDF)
- Edge function `generate-result-slip` returns a NECO-styled PDF (school logo, student, subjects, scores, grades, GPA, signature line).
- Buttons: student `Results` → "Download slip", admin `Reports` → "Download class slips (zip)".

## 6. NECO Candidate Export
- Edge function `neco-export` produces the CSV format NECO will require for candidate registration (configurable column map in `school_settings`).
- Admin `Settings → NECO` tab: map fields, preview rows, download CSV.

## 7. Offline-First PWA
- Add `vite-plugin-pwa`, service worker caches app shell + current exam payload.
- "Network lost" banner; queued answer submissions retry on reconnect.

## 8. School Settings additions
- `exams_violation_limit`, `proctoring_default`, `neco_subject_codes` (jsonb).
- Editable from `admin/Settings.tsx` new "Exams & NECO" tab.

## Database migration (single migration)
```text
create table exam_violations (id, attempt_id, type, detail, created_at)
create table exam_answers     (id, attempt_id, question_id, answer, updated_at, unique(attempt_id,question_id))
create table question_bank    (id, school_id, subject, topic, difficulty, type, body, options, answer, explanation, created_by)
create table question_tags    (question_id, tag)
alter  exams add column duration_min int, randomize bool, proctored bool, violation_limit int
alter  school_settings add neco_subject_codes jsonb, proctoring_default bool
storage bucket proctor-snapshots (private) + RLS: owner = student of attempt; admin can read
RLS on all new tables scoped by school_id + role
```

## Edge functions
- `generate-result-slip` (PDF via pdf-lib)
- `neco-export` (CSV builder)
- `score-attempt` (server authoritative scoring + grade mapping, called on submit)

## Out of scope (separate phase)
- Real biometric proctoring / live invigilator video.
- Payment for NECO registration fees.
- Native mobile apps.

## Delivery order inside this phase
1. DB migration + score-attempt function (foundation).
2. Secure CBT runner + exam_answers autosave.
3. Question bank + TestBuilder upgrade.
4. Proctoring snapshots + admin review page.
5. Analytics pages (student/teacher/parent additions).
6. PDF result slips + NECO export.
7. PWA pass.

Each step ships behind real queries — no mock data, no placeholder values.
