
# Phase 7 — Super Admin Completion

Replace the six `ComingSoon` placeholders in `/super/*` with functional pages. All required tables (`memberships`, `profiles`, `user_roles`, `platform_announcements`, `platform_audit`, `platform_settings`, `security_events`, `schools`) already exist, so this phase is pure UI + a couple of read/write flows. No business-logic changes anywhere else.

## What ships

### 1. `/super/users` — Users & Roles
- Searchable directory across every tenant: name, email, role, school.
- Filters: role (admin/teacher/student/parent/super_admin), school, status.
- Row actions: grant / revoke `super_admin` (via `user_roles`), suspend membership (set `memberships.status='suspended'`), force PIN reset (`must_change_pin=true`).
- Pagination (50/page) and CSV export.

### 2. `/super/announcements` — Platform Announcements
- List existing rows from `platform_announcements`, newest first.
- Compose dialog: title, body (textarea), audience (`all` / `admins` / `teachers` / `students` / `parents`), priority (`normal` / `high` / `critical`), optional `scheduled_for`.
- Delete + edit own rows. Writes go through `platform_announcements` (super-admin RLS already covers this).

### 3. `/super/tickets` — Support Tickets
- New tiny table `support_tickets` (school, opened_by, subject, body, status: open/pending/resolved/closed, priority, assignee, last_activity_at) + `support_messages` (ticket_id, author, body) for the thread.
- Triage view: status tabs, school filter, search.
- Detail drawer: full thread, status changer, internal note vs. reply toggle, "assign to me".
- RLS: super_admin full; school admins read/insert their own tenant's rows + messages.

### 4. `/super/security` — Security Center
- Pulls last 30 days from `security_events`: login anomalies, failed logins, IP blocks, role escalations.
- KPIs: events today, unique IPs, top offending school, escalations this week.
- Daily line chart (events/day) + table with type/IP/user/school/timestamp.
- "Mark reviewed" updates `detail.reviewed_at` (no schema change required).

### 5. `/super/logs` — System Logs
- Read-only stream of `platform_audit` with infinite scroll (cursor on `created_at`).
- Filters: action prefix, actor, school, date range.
- JSON payload viewer (popover) for each row, copy-to-clipboard, CSV export of current filter.

### 6. `/super/settings` — Platform Settings
- Single-row editor for `platform_settings` (id=1).
- Tabs:
  - **Brand**: platform name, logo upload (`school-logos` bucket reused under `platform/`), primary color, support email.
  - **SMTP**: host, port, user, password (write-only), from name/address — stored in `smtp` jsonb.
  - **Integrations**: enable/disable known providers (Paddle, Resend, Sentry, PostHog) — stored in `integrations` jsonb. Keys themselves stay in Lovable Cloud secrets, not the table.
  - **Maintenance**: `maintenance_mode` toggle + `maintenance_message` textarea.

## Technical details

- Files created:
  - `src/pages/super/Users.tsx`
  - `src/pages/super/Announcements.tsx`
  - `src/pages/super/Tickets.tsx`
  - `src/pages/super/Security.tsx`
  - `src/pages/super/Logs.tsx`
  - `src/pages/super/Settings.tsx`
  - One migration adding `support_tickets` + `support_messages` with RLS (super_admin full, school admins scoped) and an `updated_at` trigger.
- `src/App.tsx`: swap the six `ComingSoon` routes for the new components.
- Reuse existing primitives (`PageHeader`, `Section`, `MetricCard`, `StatusBadge`, `Skel`, `EmptyState`) and `AreaTrend`/`BarTrend` charts — no new design system work.
- Reuse `super-action` edge function for any privileged writes (grant role, suspend membership) so audit rows are written consistently.
- No edits to existing student/teacher/parent/admin pages.
- No changes to existing tables; only the two new ticket tables are introduced.

## Out of scope

- Real-time notifications (websockets) for tickets — left as a follow-up.
- Built-in email sending from SMTP settings page — only stores config, no provider wiring.
- Custom roles beyond `super_admin` / membership roles — out of scope.

## Risk

- Two additive tables only; existing RLS untouched.
- All new surfaces are super-admin-gated by the existing `SuperGuard`.
- No public/anon read paths added.
