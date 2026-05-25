
# Phase 8 — Communications Hub

Unify the four existing messaging surfaces (`messages`, `parent_comms`, `announcements`, `platform_announcements`) into one realtime Communications Hub available across all roles, with threaded conversations, broadcasts, read receipts, and a global notification bell.

## What ships

### 1. Unified Inbox (`/:slug/app/<role>/inbox`)
A single page replacing the per-role Messages / ParentComms / TeacherComms screens (old routes stay as redirects so nothing breaks).
- Left rail: conversation list with avatar, last message preview, unread badge, search, filters (All / Direct / Broadcast / Unread).
- Right pane: threaded view with day separators, sender chips, attachments link, "delivered/seen" indicators.
- Composer: rich text (textarea + emoji), attach from Library, recipient picker that knows the role rules below.
- Realtime: Supabase Realtime subscription on `conversation_messages` filtered by `conversation_id IN (mine)`.
- Typing indicator via Realtime Broadcast channel (no DB writes).
- Per-conversation actions: mark read/unread, mute, archive, leave (for groups).

### 2. Conversations data model
New tables, additive only — old `messages` / `parent_comms` / `announcements` keep working untouched.
- `conversations` — id, school_id, kind (`direct`|`group`|`broadcast`), title, created_by, last_message_at, last_message_preview.
- `conversation_participants` — conversation_id, user_id, role_at_join, muted, archived, last_read_at, unique(conversation_id, user_id).
- `conversation_messages` — id, conversation_id, school_id, sender_id, body, attachments jsonb, kind (`text`|`system`), reply_to, created_at, edited_at.
- `conversation_reads` derived from `participants.last_read_at` — no extra table.

Recipient rules enforced in RLS + composer:
- Student ↔ their teachers + admins only.
- Parent ↔ teachers of their linked children + admins only.
- Teacher ↔ students in their classes, parents of those students, peers, admins.
- Admin ↔ anyone in their school.
- Super admin broadcast → handled separately via `platform_announcements`.

### 3. Broadcasts & Announcements
- New `/:slug/app/admin/announcements/compose` (extends existing page) creates a `broadcast` conversation whose participants are auto-populated from audience filter (role, class, grade level).
- Read state per recipient through `conversation_participants.last_read_at`.
- Existing `announcements` table stays read-only legacy; a one-time backfill is **not** done — only new posts use the new model.
- Super-admin `platform_announcements` surfaces in everyone's bell with a pinned style.

### 4. Global notification bell
- Added to `AppLayout` topbar (next to school badge): unread count across conversations + active platform announcements.
- Popover with last 10 items, "Mark all read", deep-link to inbox/announcement.
- Realtime updates via the same channel as the inbox.

### 5. Parent ↔ Teacher comms migration
- `/:slug/app/parent/teacher-comms` and `/:slug/app/teacher/parent-comms` become thin wrappers that open the Inbox pre-filtered to that counterparty. Existing `parent_comms` rows render in a "Legacy" tab for historical access (read-only).

### 6. Edge function
- `notify-recipients` (new) — invoked after sending a broadcast; expands audience filter → bulk inserts `conversation_participants`. Runs with service role to bypass per-row RLS during fanout, audited in `platform_audit` if super-initiated.

## Technical details

Files created
- `src/pages/shared/Inbox.tsx` — unified inbox page (used by all four roles).
- `src/components/comms/ConversationList.tsx`, `Thread.tsx`, `Composer.tsx`, `RecipientPicker.tsx`, `NotificationBell.tsx`.
- `src/lib/comms.ts` — query helpers, realtime hook, recipient-rule helpers.
- `supabase/functions/notify-recipients/index.ts` — broadcast fanout.
- One migration: 3 new tables + RLS + `updated_at` trigger + `ALTER PUBLICATION supabase_realtime ADD TABLE conversations, conversation_messages, conversation_participants`.

Files edited
- `src/App.tsx`: add `inbox` route per role; keep `messages` / `parent-comms` / `teacher-comms` routes pointed at thin wrappers.
- `src/layouts/AppLayout.tsx`: insert `NotificationBell` in topbar.
- `src/pages/student/Messages.tsx`, `src/pages/teacher/Messages.tsx`, `src/pages/parent/Messages.tsx`, `src/pages/parent/TeacherComms.tsx`, `src/pages/teacher/ParentComms.tsx`: replace bodies with `<Inbox role="…" />`.
- `src/pages/admin/Announcements.tsx`: add "Send as conversation broadcast" toggle that calls `notify-recipients`.
- `.lovable/plan.md`: replace Phase 7 content with Phase 8.

RLS sketch
- `conversations`: select if `EXISTS(participant.user_id=auth.uid())` or `is_school_admin`; insert by members; update by `created_by` or admin.
- `conversation_participants`: select own row + admin in same school; insert by `is_member` (constrained to allowed counterparties in composer); update own row only (mute/archive/last_read_at); delete by admin.
- `conversation_messages`: select if participant of conversation; insert if participant and `sender_id = auth.uid()`; update only own within 5 min; no delete.

Reuses
- `useSchool`, `RoleGate`, design tokens, `Skel`, `EmptyState`, `PageHeader`, `Section`.
- Existing storage bucket `library` for attachments (no new bucket).
- `supabase.channel().on('postgres_changes', …)` pattern already used elsewhere.

## Out of scope
- Voice/video calls.
- Reactions / message threads inside a thread.
- Email/push delivery (only in-app + bell). Hook will exist for later wiring to Lovable Emails.
- Backfilling legacy `messages` / `parent_comms` into the new model.

## Risk
- Three additive tables, untouched legacy tables — zero regression on existing inboxes.
- All writes still go through RLS; `notify-recipients` is the only service-role path and only fans out participants, never message bodies.
- Realtime publication change is additive; no schema break.
