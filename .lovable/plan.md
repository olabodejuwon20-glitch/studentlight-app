# Phase 2 — Super Admin: Tenants (Schools)

Wire up the `/super` route tree and ship the first vertical slice: full Schools management (list + detail + admin actions) plus a one-time bootstrap so the first super admin can claim the role.

## 1. Route plumbing

**Edit `src/App.tsx`**
- Import `SuperLayout` + `SuperGuard` from `@/layouts/SuperLayout` and the Phase-2 pages.
- Add (above the `/:slug` block, so it's matched first):
  ```
  <Route path="/super/claim" element={<SuperClaim />} />
  <Route path="/super" element={<SuperGuard><SuperLayout /></SuperGuard>}>
    <Route index element={<SuperDashboard />} />
    <Route path="schools" element={<SuperSchools />} />
    <Route path="schools/:id" element={<SuperSchoolDetail />} />
    {/* placeholders rendering <ComingSoon/> for analytics, modules, licensing,
        configurations, marketplace, subscriptions, billing, announcements,
        tickets, security, logs, settings, users */}
  </Route>
  ```

**Edit `src/lib/tenant.ts`**
- Add `"super"` to the `RESERVED` set so `/super/...` is never treated as a school slug.

**Edit `src/layouts/SuperLayout.tsx`**
- Confirm it renders `<Outlet />` (already imported). No structural changes.

## 2. Schools list — `src/pages/super/Schools.tsx`

Server-driven table over `public.schools`.

- Header: title "Schools", subtitle "Manage every tenant on the platform", right-side `Button` "Export CSV".
- Toolbar row:
  - Search input (name/slug/email, debounced 250ms, ilike).
  - Plan filter (`trial`, `starter`, `pro`, `enterprise`, `custom`).
  - Status filter (`trial`, `active`, `past_due`, `suspended`, `cancelled`).
  - Sort: `created_at desc | name asc | plan_expires_at asc`.
- Stats strip (4 `MetricCard`s from `primitives.tsx`): Total schools, Active, Trial, Suspended (cheap `head:true count:exact` queries).
- Table columns: School (logo + name + slug), Plan badge, Status badge, Members (count via `memberships` head query, per-row lazy or aggregated query), Expires, Created, Actions (`Eye → /super/schools/:id`, dropdown: Suspend/Reactivate, Change plan, Open portal in new tab).
- Pagination: 25/page using `range()`; show `Showing X–Y of Z`.
- Empty state and skeleton rows.
- All mutating actions call `superAction(...)` then `refetch()`; success toast.

## 3. School detail — `src/pages/super/SchoolDetail.tsx`

Load by `id`. Layout: sticky header (logo, name, slug, plan/status pills, "Open portal" + "Impersonate admin (soon)" buttons), then 6 tabs (`Tabs` from shadcn):

1. **Overview** — KPI cards (members by role from `memberships` group; exams count; results count; storage used = sum of `library_files.size_bytes`). Recent audit entries from `platform_audit where school_id=:id` (latest 10).
2. **Profile** — form: name, slug, email, phone, address, motto, logo_url, platform_notice (textarea). Save → `superAction("update_school", { school_id, fields })`.
3. **Plan & Billing** — current plan/status/dates; "Change plan" dialog (plan select + optional expiry date + monthly amount NGN) → `set_plan`; "Suspend" (reason textarea) → `suspend_school`; "Reactivate" → `reactivate_school`. List recent rows from `subscriptions` + `invoices` for this school.
4. **Modules** — list of all rows in `modules` left-joined with `school_modules` for this school. Each row: toggle (enabled), beta switch, "Configure" button (opens drawer; for now a JSON textarea bound to `config` — schema-driven form lands in Phase 3). Calls `assign_module` / `toggle_module` / `update_module_config`.
5. **Members** — table of `memberships` joined to `profiles` (name/email/role/status/created_at). Row action "Force logout" → `force_logout_user`.
6. **Danger zone** — destructive card: type-`DELETE`-to-confirm → `delete_school`.

## 4. Claim page — `src/pages/super/Claim.tsx`

Already exists as a stub. Implement: if no row exists in `user_roles` with role `super_admin` and the visitor is signed in, allow them to insert `{ user_id: auth.uid(), role: 'super_admin' }` (RLS already permits self-insert). After claim → navigate to `/super`. If a super admin already exists, show "Super admin already provisioned" and link to `/signin`. `SuperGuard` redirects unauthenticated/no-role users to `/super/claim` when `hasAny === false`, else to `/signin`.

## 5. Shared bits

**`src/components/super/SchoolBadges.tsx`** — small helpers `<PlanBadge plan />` and `<StatusBadge status />` mapping to semantic tokens (`bg-primary/10 text-primary`, `bg-destructive/10`, `bg-muted` etc.) — no raw hex.

**`src/pages/super/_ComingSoon.tsx`** — reusable empty state for the placeholder routes so the whole nav is navigable.

## Files

Create:
- `src/pages/super/Schools.tsx`
- `src/pages/super/SchoolDetail.tsx`
- `src/pages/super/_ComingSoon.tsx`
- `src/components/super/SchoolBadges.tsx`

Edit:
- `src/App.tsx` (routes)
- `src/lib/tenant.ts` (reserve `super`)
- `src/pages/super/Claim.tsx` (implement)

No DB migrations, no edge-function changes — Phase 1's `super-action` already covers every mutation used here.

## Out of scope (later phases)

Modules registry CRUD page, Licensing matrix, Schema-driven ConfigForm, Subscriptions/Billing pages, Announcements, Tickets, Security center, Logs viewer, Platform settings, Analytics deep-dive, Users & Roles, Impersonation edge function.
