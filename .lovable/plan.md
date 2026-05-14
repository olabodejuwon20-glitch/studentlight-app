## Step 6 — PDF Result Slips + NECO Candidate Export

Build server-side PDF result slips and a configurable NECO candidate CSV export, then wire them into the existing Student, Admin, and Settings pages.

### 1. Edge function: `generate-result-slip`
- Input: `{ student_id, term?, session? }` (defaults to school's current term/session).
- Auth: verify caller is the student, a linked parent, a teacher, or admin of the same school (RLS-style checks via service role + membership lookup).
- Pulls: school (name, logo, motto, session, term, grading_system), student profile + membership profile_data (class, admission no), results for term, computes NECO grade per subject + overall GPA/credit pass using the same scale as `src/lib/neco.ts`.
- Renders a NECO-styled PDF using `pdf-lib` (header band with school name + logo, student bio block, subjects table with CA/Exam/Total/Grade/Remark, summary box, signature lines for Class Teacher / Principal).
- Returns `application/pdf` bytes (base64 JSON for easy client download via `supabase.functions.invoke`).

### 2. Edge function: `neco-export`
- Input: `{ class_id?, subject_codes_override? }`.
- Auth: admin only.
- Reads `schools.neco_subject_codes` (jsonb map: `{ "Mathematics": "001", ... }`) for column mapping; falls back to subject name when missing.
- Output rows per student: `CandidateName, AdmissionNo, DOB, Gender, Class, SubjectCode1..N` based on enrolled subjects/results.
- Returns CSV text.

### 3. Client wiring
- `src/lib/slip.ts` — small helper `downloadResultSlip(studentId, term?)` that invokes the function and triggers a browser download.
- `src/pages/student/Results.tsx` — add **"Download slip (PDF)"** button next to existing CSV/PDF export.
- `src/pages/parent/Results.tsx` — same button per child.
- `src/pages/admin/Reports.tsx` — add **"Download class slips (ZIP)"** for a selected class: loops students client-side, fetches each PDF, zips with `jszip`, triggers download.
- `src/pages/admin/Settings.tsx` — new **"Exams & NECO"** tab:
  - Edit `exams_violation_limit`, `proctoring_default`.
  - Editable table for `neco_subject_codes` (subject → code rows, add/remove).
  - "Preview CSV" button → calls `neco-export` and shows first 10 rows in a dialog.
  - "Download full CSV" button.

### 4. Dependency
- Add `jszip` (small, ~100KB) for the class-slips zip. `pdf-lib` is added inside the edge function only (Deno `npm:pdf-lib`).

### 5. No DB migration required
All needed columns already exist (`schools.neco_subject_codes`, `proctoring_default`, `exams_violation_limit`, `memberships.profile_data`).

### Files to create
- `supabase/functions/generate-result-slip/index.ts`
- `supabase/functions/neco-export/index.ts`
- `src/lib/slip.ts`

### Files to edit
- `src/pages/student/Results.tsx`
- `src/pages/parent/Results.tsx`
- `src/pages/admin/Reports.tsx`
- `src/pages/admin/Settings.tsx`
- `package.json` (add `jszip`)

### Out of scope (still deferred to step 7)
- PWA / offline support.
- Emailing slips to parents (can be a follow-up).
