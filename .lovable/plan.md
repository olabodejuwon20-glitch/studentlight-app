## Traditional Exam System — Phase 1

A new module sitting alongside (not replacing) the existing CBT system. Phase 1 delivers the planning + authoring foundation only. Approvals, scheduling, student execution, and scratch cards land in later phases.

Namespace convention: `trad_*` tables, `/admin/trad-exams/*` and `/teacher/trad-exams/*` routes, `traditional-exams` module slug. Nothing in `exams`/`assessments`/`questions_v2` is touched.

### 1. Database (new migration)

New tables, all `school_id`-scoped with RLS + GRANTs:

- `trad_exam_sessions` — exam period container (e.g. "2026 First Term Exams"). Fields: name, term, year, start_date, end_date, status (`planning|published|locked`), created_by.
- `trad_exam_timetable` — one row per scheduled paper. Fields: session_id, class_id, subject_id, exam_date, start_time, duration_minutes, venue, status (`draft|pending|approved`). DB-level conflict check via trigger (same class + overlapping time window).
- `trad_exams` — the exam paper itself, linked 1:1 to a timetable row. Fields: timetable_id, title, instructions, total_marks, exam_type (`mcq|theory|mixed`), draft_status (`draft|submitted`), author_id.
- `trad_exam_sections` — optional sections within a paper (Section A: MCQ, Section B: Theory). Fields: exam_id, label, instructions, position.
- `trad_exam_questions` — question bank for this module. Fields: exam_id, section_id, position, type (`mcq|theory`), prompt, options (jsonb, MCQ only), correct_index (MCQ, kept private), marks, image_path (storage), explanation, ai_generated bool.
- `trad_exam_uploads` — record of uploaded source documents. Fields: exam_id, file_path, mime, status (`pending|parsing|parsed|failed`), parse_meta jsonb, uploaded_by.

Storage:
- New private bucket `trad-exam-assets` for source docs + extracted diagram images. RLS scoped to school staff.

RLS summary (Teacher → Admin only, no HOD this phase):
- Admins (full or slotted with new `trad-exams` permission) — full CRUD within their school.
- Teachers — CRUD on their own draft exams + read on timetable rows for their assigned class/subject.
- Students/parents — no access in Phase 1.

### 2. Permissions + module registration

- Add `traditional-exams` to `src/modules/registry.ts` with sidebar entries for admin ("Traditional Exams") and teacher ("Exam Papers").
- Add `trad-exams` and `action:approve_trad_exam` to `PERMISSION_GROUPS` in `src/lib/adminPermissions.ts` (new "Examinations" group) so the existing custom-role workspace can grant/revoke it.

### 3. Routes (added to `src/App.tsx`)

Admin:
- `/admin/trad-exams` — sessions list + create
- `/admin/trad-exams/:sessionId` — timetable builder (drag-drop grid by class × day) with conflict detection
- `/admin/trad-exams/:sessionId/calendar` — month/week calendar view

Teacher:
- `/teacher/trad-exams` — list of papers assigned to me (by class/subject)
- `/teacher/trad-exams/:examId` — paper editor (sections, questions, upload)
- `/teacher/trad-exams/:examId/upload` — document upload + AI parse review

### 4. UI components (new, in `src/components/tradexam/`)

- `SessionCard`, `SessionForm`
- `TimetableGrid` — drag-drop using existing libs (react-dnd already present? if not, use HTML5 DnD + state). Highlights conflicts in red.
- `ConflictBadge`
- `ExamCalendar` — reuses `MonthCalendar`.
- `QuestionEditor` with two modes:
  - **MCQ**: prompt (rich text), 4 options A–D, correct answer, marks, optional image upload.
  - **Theory**: prompt, expected marks, optional image upload, model-answer field (private).
- `SectionList` with reordering.
- `DocumentUploadPanel` — drop PDF/DOCX, shows parse progress, then a review table where the teacher can edit/accept each extracted question before they hit `trad_exam_questions`.

### 5. AI document parsing edge function

New function `supabase/functions/parse-trad-exam-doc/index.ts`:

1. Auth: JWT required; verify caller is teacher/admin of the exam's school.
2. Download file from `trad-exam-assets` (PDF or DOCX).
3. Extract text:
   - PDF: use `pdfjs-dist` via `npm:` import.
   - DOCX: use `mammoth` via `npm:`.
4. Extract embedded images and upload each to `trad-exam-assets/extracted/<exam_id>/img-N.png`, capturing their byte position so we can re-attach them.
5. Send the text (+ image placeholders) to Lovable AI Gateway (`google/gemini-2.5-pro` for accuracy on mixed MCQ/theory) with a strict JSON schema: `{questions:[{type, prompt, options?, correct_index?, marks, image_ref?}]}`.
6. Persist results to `trad_exam_questions` with `ai_generated=true` and `draft_status` so the teacher can review/edit before submitting. Update `trad_exam_uploads.status`.

Surfaces 402/429 errors verbatim per the AI-gateway guidance.

### 6. Offline / caching

Reuse the existing `dataCache.ts` pattern to cache session lists, timetable rows, and exam drafts per school — same approach as other admin pages.

### 7. What this phase does NOT do (deferred)

- Approval workflow (Teacher → Admin chain, version history, lock-after-approve)
- Auto-publish at scheduled time + student exam listing
- Student exam UI, auto-save, auto-submit
- MCQ auto-marking, theory grading queue, admin validation
- Scratch card PIN generation, Paystack purchase flow, result unlock
- Student/parent result viewing

These are scoped for Phase 2 and Phase 3 follow-ups so we don't ship a half-broken pipeline.

### Risk + compatibility notes

- All names prefixed `trad_` so no collision with `exams`, `exam_questions`, `assessments`, `questions_v2`.
- No edits to `auth`, `memberships`, CBT tables, or `src/integrations/supabase/client.ts`.
- New permission key plugs into the existing `useAdminPermissions` hook — full admins get it automatically; slotted admins must be granted via the Roles workspace.
- Module is registered through `MODULE_MANIFESTS` so the existing super-admin module toggle controls per-school visibility.

Approve this and I'll run the migration, then build the routes, components, and the AI parsing function.
