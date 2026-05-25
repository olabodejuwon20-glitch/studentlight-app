# Legacyskool — End-to-End Verification Checklist

Use this checklist after each major change to confirm a clean school can be
spun up, branded, populated with users, and that every portal loads with the
correct role-based UI.

Estimated time: ~15 minutes per full run.

---

## 0. Prep

- [ ] Open the app in an **incognito / private window** so no prior session leaks in.
- [ ] Have **4 throwaway email addresses** ready (one per role): admin, teacher, student, parent. Gmail "+" aliases work (e.g. `you+admin@gmail.com`).
- [ ] Have a **school logo** (PNG/JPG, < 2 MB) on disk for the branding step.
- [ ] If testing on mobile, also keep a phone / DevTools mobile emulator handy.

---

## 1. Register a school (Admin)

1. [ ] Go to `/` → click **Register your school** (or visit `/register`).
2. [ ] Fill in:
   - School name (e.g. `Test Academy`)
   - Slug (auto-generated; tweak if needed, e.g. `test-academy`)
   - Admin email + password (use the **eye icon** to confirm the password is correct)
3. [ ] Submit. You should be redirected to `/<slug>/app/admin`.
4. [ ] Verify the **admin sidebar** shows: Dashboard, Students, Teachers, Classes, Timetable, Library, Fees, Hostel, Transport, Announcements, Reports, Invites, Bulk Upload, Settings.
5. [ ] Check the school name appears in the bottom-left of the sidebar.

**Pass criteria:** new school created, you land on the admin dashboard with no empty-state errors.

---

## 2. Branding & school info (Admin → Settings)

1. [ ] Open **Settings** in the admin sidebar.
2. [ ] **Upload logo**: click the logo upload control, pick your file. Confirm:
   - Preview updates immediately
   - Toast "Saved" / "Uploaded" appears
3. [ ] Fill in additional info: address, phone, email, motto, current session, current term, resumption date, grading system.
4. [ ] Save. Refresh the page — values persist.
5. [ ] Open a **new tab** at `/<slug>` (school home) and `/<slug>/signin` (school login). Confirm the logo and school name appear on both.

**Pass criteria:** logo visible on school portal login page; all fields persist after refresh.

---

## 3. Generate invite codes (Admin → Invites)

1. [ ] Open **Invites**.
2. [ ] Create one code per role:
   - [ ] `teacher` (max uses ≥ 5)
   - [ ] `student` (max uses ≥ 20)
   - [ ] `parent` (max uses ≥ 10)
3. [ ] Copy each code somewhere temporary (you'll need them in step 4).
4. [ ] Confirm the codes list shows uses = 0 / max for each.

**Pass criteria:** three active codes visible with correct roles.

---

## 4. Onboard one user per role (Join flow)

Repeat for each of **teacher**, **student**, **parent**. Sign out of admin between runs (or use separate private windows).

1. [ ] Visit `/<slug>/join` (or click the "Join with a code" link from the school home).
2. [ ] Enter the invite code → enter email + phone + a 6-digit PIN (twice). Submit.
3. [ ] You should be redirected to `/<slug>/app/<role>`.
4. [ ] First-time only: confirm you're prompted for **Bio** (DOB, gender, address). Fill and save.
5. [ ] Sign out.
6. [ ] Sign back in at `/<slug>/signin` using **only phone + PIN**. Confirm you do **not** get asked to set the PIN again.

**Pass criteria:** each role lands on its own portal; second login is phone + PIN only.

---

## 5. Per-portal smoke test

For each portal, log in and verify the headline tiles render real data (zeros are OK on a brand-new school) and every nav item opens without error.

### 5a. Admin (`/<slug>/app/admin`)
- [ ] Dashboard tiles: total students, teachers, classes.
- [ ] **Students** / **Teachers** lists show the users you onboarded.
- [ ] **Classes** → create a class, assign the teacher. No errors.
- [ ] **Announcements** → post one. Appears in the list.
- [ ] **Settings** still shows the logo and saved info.

### 5b. Teacher (`/<slug>/app/teacher`)
- [ ] Dashboard loads with the green/teal teacher accent.
- [ ] **My Classes** shows the class you just created.
- [ ] **Test Builder** → create a 2-question test → Publish (no error).
- [ ] **Calendar** shows the full-month grid; the test you scheduled appears as a red chip on its date.
- [ ] **Messages** → search the student/parent by name and send "hello". On mobile width the list collapses to thread view with a back arrow.
- [ ] **Lesson Plan**, **Resources**, **Reports**, **Grading**, **Attendance** all open without console errors.

### 5c. Student (`/<slug>/app/student`)
- [ ] Dashboard tiles: Upcoming Exams (should include the teacher's test), Attendance %, Average Score, Assignments.
- [ ] **Exams** → the published test appears; click it → exam interface loads.
- [ ] **Calendar** shows the same exam on the correct date in the full-month grid.
- [ ] **Library**, **Results**, **AI Tutor** all open.
- [ ] The announcement from 5a is visible in the dashboard activity feed.

### 5d. Parent (`/<slug>/app/parent`)
- [ ] Dashboard renders. If no child is linked yet, **My Children** shows the empty state.
- [ ] Have the admin link the student to this parent: Admin → Students → row → **Link parent** (or via `parent_links` in the DB).
- [ ] Refresh parent dashboard — children count = 1, attendance donut renders.
- [ ] **Calendar**, **Attendance**, **Results**, **Fees & Payments**, **Activity Feed**, **Messages** all open.
- [ ] Reply to the teacher in **Messages** — message appears in real time on the teacher tab.

**Pass criteria:** every nav item opens with no white screen, no console errors, and stats reflect what you created.

---

## 6. Mobile responsiveness pass

Resize the preview to **375 × 812** (iPhone) and revisit:

- [ ] Sidebar collapses; the **hamburger menu** opens and closes the drawer.
- [ ] Dashboard tiles stack to one column without overflow.
- [ ] Messages list/thread swap via the back arrow.
- [ ] Month calendar cells are readable; chips truncate gracefully.
- [ ] Profile photo upload works from a phone-width view.

---

## 7. Cleanup (optional)

- [ ] Sign out of every role.
- [ ] If this was throwaway data, drop the school row (admin → DB) or rename it to `archived-…`.

---

## Seed flow (faster than clicking)

If you want to skip steps 1–4 manually, the registration and join endpoints
can be driven from the UI in any order — there is intentionally **no SQL
seed script** because every user must own their auth row (passwords + PINs
are hashed by Supabase Auth). The fastest path is:

1. Register the school in the UI (step 1).
2. As admin, create one **teacher**, one **student**, one **parent** invite
   code with `max_uses = 1`.
3. In three private windows, paste each code into `/<slug>/join` and finish
   the bio step.
4. As admin, create one **class** and one **parent_link** so the parent
   portal has data.

That's enough fixture data to exercise every screen in step 5.

---

## Known good signals

If everything below is true, the build is healthy:

- The admin who registered the school is auto-added to `memberships` with role `admin` (via `bootstrap_school_admin` trigger).
- `redeem_invite()` increments `invite_codes.uses` and inserts into `memberships`.
- `profiles.photo_url` updates after Profile → upload.
- `schools.logo_url` updates after Settings → upload, and the school login page reads it.
- RLS: opening `/<other-slug>/app/admin` while logged into school A redirects to its sign-in page (no cross-tenant data leaks).