# Build Plan — Portal Completion + NECO Strategy

The mockups cover three full dashboards plus many sub-screens. To ship quality (not stubs), I'll split this into 3 phases. I'll execute Phase 1 immediately on approval, then Phase 2 and 3 in follow-up turns so each phase is reviewable.

## Phase 1 — Foundation (this turn)

**Profile photos (all roles)**
- New page `src/pages/Profile.tsx` accessible from sidebar avatar in `AppLayout`.
- Upload to existing `avatars` bucket at path `{user_id}/avatar.{ext}`; save public URL to `profiles.photo_url`.
- Add storage RLS migration so users can upload/replace only their own folder.
- `ProfileCard` + every header avatar reads `photo_url` from profiles (live, not mock).

**Student portal — match mockup #1**
- `student/Dashboard.tsx`: real data only — `Upcoming Exams` (count from `exams` where scheduled_at>now & class enrolled), `Average Score` (avg of `results.score`), `Assignments Pending` (count exams with status='published' user hasn't attempted), `Attendance %` (from `attendance` table).
- Add Quick Access tile row, real Calendar (from `exams` + `announcements`), real Activity Feed (recent attempts/results/attendance), real Recent Results table, AI Tutor preview using last `ai_chats`.
- Existing pages — `student/Calendar.tsx`, `Library.tsx`, `Results.tsx` — fully built with live queries (no placeholders).

**Teacher portal — match mockup #2**
- `teacher/Dashboard.tsx`: My Classes count, Total Students (sum enrollments across teacher's classes), Attendance Today %, Pending Tasks (ungraded attempts), Tests This Week, Assignments To Grade — all from real queries.
- Today's Schedule from `timetable` (filter teacher_id + day_of_week=today), Class Performance bar chart from `results` grouped by class, Pending Assignments from `exams`+`exam_attempts`, Upcoming Tests, Quick Actions, Messages preview.
- Add `teacher/Calendar.tsx`, `teacher/LessonPlan.tsx`, `teacher/Resources.tsx`, `teacher/Reports.tsx`, `teacher/Messages.tsx`.

**Parent portal — match mockup #3**
- `parent/Dashboard.tsx`: My Children count (from `parent_links`), Average Grade across children's `results`, Attendance %, Fees Due (sum unpaid `fees`), Unread Messages count.
- Children cards with per-child overall avg + last result + next event.
- Attendance donut, Recent Results matrix (subjects × children), Fees & Payments live, Upcoming Events from `exams`/`announcements`, Activity Feed, Child Performance trend chart per selected child, Quick Actions.
- Add `parent/Calendar.tsx`, `parent/SchoolUpdates.tsx` if missing.

**Shared**
- New `RoleHeader` component (avatar + greeting + search + bell + date) used by all three dashboards to match mockup chrome.
- All copy and numbers come from queries; if a query returns empty, show `EmptyState` (no fake numbers).

## Phase 2 — Polish & remaining sub-pages (next turn)
- Messaging UI (compose, thread view) wired to `messages`.
- Assignments flow for students (list/submit), teacher grading queue.
- Calendar full-month view component shared across roles.
- Mobile responsiveness pass on all new dashboards.

## Phase 3 — NECO digital-exam positioning (next turn, after Phase 2 ships)
Code additions to make the platform NECO-ready:
1. **Secure CBT exam runner** — fullscreen lock, tab-switch detection, copy/paste blocking, randomized question order per student, server-side timer, auto-submit on timeout. Extends existing `student/ExamInterface.tsx`.
2. **Proctoring lite** — webcam snapshots every 30s stored in private bucket, flagged for review by exam admin.
3. **Question bank import** — admin uploads CSV/JSON of past NECO-style MCQs into `exam_questions`; auto-generate mock exams per subject.
4. **NECO-aligned analytics** — predicted grade per student per subject (rolling avg of last N results), weakness heatmap, AI Tutor auto-suggests topics from weak areas (uses existing Lovable AI gateway).
5. **Offline-first PWA** — service worker caches exam shell so partial network loss doesn't kill an attempt.
6. **Result sheets** — printable NECO-style result slips (PDF) generated from `results` for end-of-term.
7. **School-to-NECO bridge** — export endpoint (`/functions/neco-export`) producing the candidate-registration CSV format schools will need to submit.

These features turn the platform into the obvious choice when NECO mandates CBT — schools that adopt now get a year of mock-CBT practice, proctoring, and analytics, which competitors will scramble to add.

## Out of scope (won't touch this run)
- Payment gateway integration for fees (UI only).
- Real-time push notifications (bell shows unread count from DB only).
- Native mobile apps.

## Technical notes
- All queries use `useSchool()` for `school_id` and existing RLS — no policy changes except `avatars` storage.
- Charts via `recharts` already installed.
- No new top-level deps.
- One migration: `avatars` storage RLS + ensure `profiles.photo_url` writable by owner (already is).
