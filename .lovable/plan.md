# Plan: Admin expansion, branded settings & dashboard redesign

## 1. Database & Storage
Create a new migration that:
- Adds columns to `schools`: `motto`, `current_session`, `current_term`, `grading_system`, `resumption_date`.
- Creates a public storage bucket `school-logos` with RLS so school admins can upload/replace their own school's logo (path scoped to `<school_id>/...`); everyone can read.
- Adds new admin-only tables (school-scoped, RLS via `is_school_admin`):
  - `timetable` (class_id, day_of_week, period, subject, teacher_id, start_time, end_time)
  - `hostels` (name, capacity, warden, gender)
  - `transport_routes` (name, driver, vehicle_no, capacity, fee)
  - `subjects` (name, code, class_id) — used by Classes & Subjects page

## 2. Admin pages (new in sidebar)
Add these routes/pages with simple CRUD using the existing `SectionCard`/table pattern:
- `Classes & Subjects` — extend existing Classes with a Subjects panel.
- `Timetable` — weekly grid view + add/edit slot.
- `Hostel` — list + add/edit hostel.
- `Transport` — list + add/edit route.
- `Announcements` — already partial; add an admin management page (list/create/delete).

Update `AppLayout` admin nav to match the sidebar order in image #4: Dashboard, Students, Teachers, Classes, Attendance, Exams, Results, Library, Fees & Payments, Reports, Hostel, Transport, Announcements, Settings, Users & Roles (existing Invites).

## 3. Admin Settings redesign (image #1)
Rebuild `src/pages/admin/Settings.tsx` with two grouped cards:
- **School Information** — Name, Address, Phone, Email, **Logo upload** (file input → Supabase Storage `school-logos` bucket → save `logo_url`), Motto.
- **Academic Settings** — Current Session, Current Term, Grading System, Resumption Date.
Keep the existing portal URL share block at the top.

## 4. Show school logo on portal login
`SchoolLogin.tsx`, `SchoolAdminLogin.tsx`, `SchoolHome.tsx`, `Join.tsx` already load the school via `SchoolContext`. Render `school.logo_url` (with graceful fallback) above the title, similar to image #2.

## 5. Dashboard redesigns (images #3 and #4)
Match layouts exactly using existing semantic tokens (no hard-coded colors):

- **Admin Dashboard** — Top stat row (Total Students, Total Teachers, Active Classes, Total Revenue) with delta chips; Student Enrollment Trend (line chart, recharts); Recent Activities feed; Recent Students table with action icons; Reports Overview row (Performance by Class bar chart, Attendance donut, Top Performing Students list).
- **Teacher Dashboard** — Greeting header; stat row (My Classes, Today's Classes, Pending Grading, Attendance Today); Today's Schedule list; Recent Activities; My Classes cards with attendance %; Pending Grading table; Attendance Overview table; Recent Submissions list.
- **Student Dashboard** — Greeting + date picker; stat row (Upcoming Exams, Attendance %, Recent Score, Assigned Tasks); Upcoming Exams list; Performance Overview line chart; Announcements row.
- **Parent Dashboard** — Child profile card with overall metrics; stat row (Attendance, Latest Result, Pending Fees, Assignments); Recent Results table; Attendance Overview donut.

Charts use `recharts` (already a shadcn dependency via `chart.tsx`). All colors via CSS tokens from `index.css`. Data wired to existing tables; if a table is empty, render `EmptyState`.

## Technical notes
- Logo upload uses `supabase.storage.from('school-logos').upload(\`${school.id}/logo-${Date.now()}.${ext}\`, file, { upsert: true })` → `getPublicUrl` → update `schools.logo_url`.
- New tables follow existing pattern: `school_id`, `is_member` SELECT policy, `is_school_admin` ALL policy.
- Sidebar uses existing `AppLayout` nav array; just extend the admin section.
- Recharts theme reads `hsl(var(--primary))` etc. so dashboards stay on-brand.

## Out of scope (ask if you want them)
- Real-time payments integration for the Revenue stat (uses sum of `fees` instead).
- Notifications bell dropdown wiring (UI only for now).

Approve and I'll ship it.