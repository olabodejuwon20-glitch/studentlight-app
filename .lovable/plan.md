# Restructure Auth & Onboarding for Multi-Tenant Schools

## The model (what we're building toward)

```
edusmart.com               → Public marketing + "Register your school" (admin signup only)
<slug>.edusmart.com        → A specific school's portal (admin + members live here only)
```

- A school portal is **bound to one school**. No "switch school", no "create new school", no "your schools list" inside it.
- Every registered admin email = exactly one school. Re-registering creates a new school subdomain.
- Slug = `slugify(schoolName) + "-" + 2 random letters` (collision-safe), e.g. `greenfield-ab`.

## Flows

### A. Register a new school (root domain only)
1. Admin visits `edusmart.com/register`.
2. Enters: school name, admin full name, email, password.
3. Backend creates the school (auto slug), creates admin user, links admin membership.
4. Redirect to `https://<slug>.edusmart.com/app` (admin dashboard).

Preview fallback (when not on a real subdomain): use `?school=<slug>` so it still works in `lovable.app`.

### B. Sign in (subdomain only)
On `<slug>.edusmart.com/auth`:
- **Admin tab**: email + password (must be admin of this school).
- **Member tab (Teacher / Student / Parent)**: full name + phone + 6-digit PIN.

No "find your school", no "create / join", no admin signup here.

### C. Onboard members — two ways (admin only, inside portal)

**Way 1 — Per-role onboarding codes**
- Admin generates codes from `/app/admin/invites`:
  - Student → `STU-XXXXX`
  - Teacher → `TCH-XX`
  - Parent → `PRT-XX`
- Member visits `<slug>.edusmart.com/join`, enters the code.
- Forced bio form (no skip): Name, phone, **personal 6-digit PIN**, gender, DOB, address, photo, role-specific fields.
- On submit: account created, membership active, redirected to their portal.

**Way 2 — Bulk CSV upload**
- Admin picks role + uploads CSV (`full_name, phone`).
- Each row → user created with PIN = `123456`, membership active, `must_change_pin = true`.
- No code needed.

### D. First sign-in for bulk users
- They sign in with phone + `123456`.
- Forced "Change PIN" screen (no skip) — sets new 6-digit PIN, clears `must_change_pin`.
- Then routed to their portal.

## What we remove / fix

- **Delete `/onboarding` page** (the "Welcome, my — Your schools / Create / Join" screen in image 2). No multi-school picker.
- **Remove "Switch school" item** from the header dropdown (image 1). Keep only school name + Logout.
- Remove "Create / join" tab from `/auth` on subdomains.
- Remove `src/pages/admin/CreateSchool.tsx` and its sidebar entry & route — admins don't create more schools from inside a portal.
- After admin signs up, do NOT route to `/onboarding`; route to their school subdomain dashboard.

## File changes

**New**
- `src/pages/Register.tsx` — public school registration (root domain).
- `src/pages/Join.tsx` — code-based member onboarding form (forced bio + PIN).
- `src/pages/ChangePin.tsx` — forced PIN change for bulk users.
- `src/pages/admin/BulkUpload.tsx` — CSV upload UI (role select + file input + preview + commit).
- `supabase/functions/register-school/index.ts` — creates school with collision-safe slug + admin user + membership atomically.
- `supabase/functions/join-with-code/index.ts` — validates onboarding code, creates user with chosen PIN, membership.
- `supabase/functions/bulk-onboard/index.ts` — accepts `{role, rows[]}`, creates users with PIN `123456` and `must_change_pin=true`.

**Edit**
- `src/pages/Auth.tsx` — strip to two tabs on subdomain (Admin email/password, Member name+phone+PIN). Strip everything on root → just a CTA to `/register` and a "Go to my school" slug box.
- `src/pages/admin/Invites.tsx` — generate STU/TCH/PRT-prefixed codes per role.
- `src/layouts/AppLayout.tsx` — remove "Switch school" + "New School" sidebar item. Header dropdown: school name + Logout only.
- `src/App.tsx` — add `/register`, `/join`, `/change-pin`, `/app/admin/bulk`; remove `/onboarding`, `/app/admin/new-school`.
- `src/components/Guards.tsx` — `RequireAuth` redirects to `/auth`; new `RequirePinChange` redirects bulk users to `/change-pin` until done.
- `supabase/functions/phone-auth/index.ts` — keep only the sign-in path (name + phone + PIN, scoped to school). Remove the `signup` path entirely.

## Database (one migration)

```sql
-- Forced PIN change flag for bulk-onboarded users
alter table memberships add column if not exists must_change_pin boolean not null default false;

-- Onboarding codes per role (replace/extend existing invite_codes usage)
-- We'll keep invite_codes table but ensure code prefix matches role (STU/TCH/PRT) at generation time.
-- No schema change needed there.
```

Edge functions use service role to create users (`auth.admin.createUser`), insert into `profiles` and `memberships`, with the right `must_change_pin` flag.

## URL helper (preview-safe)

```ts
function buildSubdomainUrl(slug: string, path = "/app") {
  const u = new URL(window.location.href);
  const host = u.hostname;
  const isPreview = host === "localhost" || host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com");
  if (isPreview) { u.searchParams.set("school", slug); u.pathname = path; return u.toString(); }
  const root = host.split(".").slice(-2).join(".");
  return `${u.protocol}//${slug}.${root}${path}`;
}
```

## After this lands

- Root domain shows: marketing + "Register your school" + "Go to my school" slug box.
- A school subdomain shows: only that school's auth + that school's portal.
- Admins onboard members via codes or CSV; members sign in with name + phone + PIN; bulk users are forced to change `123456` on first login.

Approve and I'll implement.