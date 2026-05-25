
# LEGACYSchools — Education SaaS Transformation Plan

The codebase already has solid foundations: multi-tenant `school_id` scoping on every table, RLS via `is_member` / `has_school_role` / `is_school_admin`, a `modules` + `school_modules` + `module_requests` schema, an `exam_*` stack with server-side grading edge function, and role layouts. The work below builds on those rather than rewriting them.

To keep risk low and reviews tight, I'll ship in 6 focused phases. Each phase is independently shippable — you can stop after any one and the app still works.

---

## Phase 1 — Stabilization & Foundation (no visual redesign)

Goal: clean the base so later phases plug in safely.

- Folder structure
  - `src/modules/<slug>/` for self-contained module bundles (routes, sidebar entries, settings panels, hooks)
  - `src/lib/tenant/` — consolidate `tenant.ts`, school context helpers, role guards
  - `src/lib/api/` — typed thin wrappers around Supabase queries per domain (results, exams, gradebook…)
  - `src/components/dashboard/` stays; promote repeated patterns (filter bar, export bar, status pill) into shared primitives
- Reusable UI primitives (extract from existing pages, no redesign)
  - `<PageHeader>`, `<FilterBar>`, `<ExportBar>`, `<StatusPill>`, `<DataTable>`, `<LoadingBlock>`, `<ErrorBlock>`
  - Standard empty/loading/error states everywhere using existing `EmptyState`
- Route protection
  - Single `<RoleGuard roles={[...]}>` wrapper; replace ad-hoc checks in `App.tsx`
  - `<ModuleGuard slug="cbt">` that reads `school_modules` (Phase 3 unlocks this)
- State
  - Introduce `@tanstack/react-query` (already common in shadcn stack) for cached tenant-scoped reads; keep Supabase client direct for mutations
- Responsiveness & typography pass on the heaviest pages (Dashboard, Results, Gradebook, ExamInterface) — spacing tokens only, no palette change
- Error handling: a `<RootErrorBoundary>` + toast on Supabase errors via a small wrapper

No DB changes in this phase.

---

## Phase 2 — Multi-Tenant Hardening

Most of this exists; this phase closes gaps.

- Tenant routing
  - Keep current `/s/:slug/...` style; add a `<TenantProvider>` that resolves slug → `school` once and exposes it via context (already partially in `SchoolContext`)
  - Guard: if user is not a member of the slug's school, redirect to their default school
- Subdomain support (optional, behind a feature flag)
  - `school.legacyschools.app` resolves via the public `school_directory` view already exposed to `anon`
- Audit columns: ensure new tables in later phases include `school_id`, `created_by`, `created_at`, `updated_at` + the `set_updated_at` trigger
- Permissions matrix doc in `docs/PERMISSIONS.md` (which role can do what) — used to drive Phase 3 module manifests

---

## Phase 3 — Module / Plugin System (the core architectural shift)

This is the biggest leverage point. The DB tables `modules`, `school_modules`, `module_requests` already exist — we wire them to the frontend.

- Module manifest (TypeScript, in-repo)
  ```text
  src/modules/<slug>/manifest.ts
    - slug, name, icon, category
    - routes: [{ path, element, roles }]
    - sidebar: [{ label, icon, path, roles }]
    - settingsPanel?: ReactComponent   // rendered in school settings
    - defaultConfig: Record<string, unknown>
    - configSchema: JSONSchema-ish for the settings UI
  ```
- Module registry (`src/modules/registry.ts`) imports all manifests and exposes `getEnabledModules(schoolId)` which:
  1. fetches `school_modules` rows for the school
  2. intersects with in-repo manifests
  3. returns enabled modules + merged config
- Dynamic rendering
  - `AppLayout` sidebar is generated from enabled modules per role
  - `App.tsx` route tree mounts module routes lazily via `React.lazy`
  - `<ModuleGate slug="...">` wraps premium routes
- Seed manifests for what already exists: `cbt`, `gradebook`, `assignments`, `behavior`, `parent-comms`, `library`, `ai-tutor`, `hostel`, `transport`, `fees`, `lesson-notes`
- Module config UI: a generic settings renderer that reads `configSchema` and writes to `school_modules.config`
- Module request flow: school admin clicks "Request module" → row in `module_requests` → super admin approves → toggles `school_modules.enabled`

This is the change that converts the app from "school management system" to "education OS".

---

## Phase 4 — Feature Licensing & Tenant Configuration

Builds directly on Phase 3.

- Plans
  - Use existing `schools.plan` (`trial` / paid tiers); add a plan→modules matrix in `src/lib/plans.ts`
  - `getEnabledModules` enforces: a module is enabled only if (in school_modules AND plan allows) OR (super-granted)
- Per-school module config drives behavior, e.g. CBT:
  ```text
  cbt.config = {
    webcamProctoring: true,
    aiProctoring: false,
    negativeMarking: false,
    randomizeQuestions: true,
    violationLimit: 3,
    showAnswersAfterEach: false
  }
  ```
  ExamInterface and grade-exam-attempt read from config instead of hardcoding.
- Billing surface: read-only invoices view for school admins (table exists); super admin can mark paid
- Trial expiry banner driven by `plan_expires_at`

---

## Phase 5 — CBT Ecosystem polish (match uploaded mockup)

The uploaded `image-3.png` is a high-quality NECO CBT layout. Current `ExamInterface.tsx` has the logic; this phase brings it to the mockup's visual + flow quality.

- Three-pane layout
  - Left rail: school logo, exam meta, exam details (questions, marks, duration, start/end), legend, "End Exam" destructive button
  - Center: top status bar (Subject, Mode, Student, Time Remaining ring, Submit Exam), single-question view with "Mark for Review" checkbox, Previous/Next
  - Right rail: 6-column question navigator with color states (answered/marked/current/unanswered), progress bar, "NECO Time Guide" tip card
- Behavior already present that we keep: auto-save, server-side grading via `grade-exam-attempt`, finish confirmation, violation tracking
- Add: single-question paging mode (current is scroll-all), "Mark for review" state stored in `exam_answers` (new nullable `marked_for_review boolean default false`), KaTeX/MathJax rendering for math prompts, auto-submit on timer expiry
- Question bank → exam builder: pull from existing `question_bank` into `exam_questions` with one-click; tag filtering already supported
- Exam review mode (post-submit): show correct answers only if `show_answers_after_each` is true or exam is closed
- Anti-cheating: tab-visibility violations already logged; add fullscreen-exit and right-click block, count toward `violation_limit`, auto-submit when exceeded

DB change: `ALTER TABLE exam_answers ADD COLUMN marked_for_review boolean NOT NULL DEFAULT false;`

---

## Phase 6 — Super Admin Control Center + AI + Hardening

Three small phases combined since each is incremental.

Super Admin (Stripe/Linear/Vercel feel — reuses existing `super/*` pages)
- Schools table: status, plan, MAU, last activity, quick actions (suspend, extend trial, impersonate)
- Subscriptions & invoices view (existing `invoices` table)
- Module marketplace: list all `modules`, toggle per school, set `expires_at`
- Audit log viewer (`platform_audit`)
- Security center (re-uses scan results), announcement center (`platform_announcements`), support inbox (new lightweight `support_tickets` table)
- Impersonation: super-only edge function that issues a short-lived session for a target school admin, logged to `platform_audit`

AI & Learning Intelligence (extends existing `ai-tutor` function)
- Homework helper: per-assignment chat scoped to submission
- Weak-subject detection: derive from `gradebook_entries` + `results` (server-side aggregate)
- Smart revision: surface lowest-mastery topics on student dashboard
- Exam recommendations: suggest practice exams matching weak subjects

Production hardening
- Route-level `React.lazy` + `Suspense`
- React Query caching with sane staleTime per domain
- Bundle analyzer pass; trim recharts where Sparkline suffices
- Sentry-style error boundary → write to `security_events` for admin errors
- Add indexes for hot paths: `exam_attempts(student_id, exam_id)`, `gradebook_entries(school_id, student_id, term)`, `results(school_id, student_id, term)`

---

## Technical details

DB migrations introduced across phases:
- Phase 5: `exam_answers.marked_for_review`
- Phase 6: `support_tickets` table, indexes

No destructive migrations. All RLS additions follow the existing `is_member` / `has_school_role` pattern. The `school_modules` model is already the source of truth for module enablement.

Out of scope for this plan (call out so we don't over-scope):
- True subdomain DNS automation (manual until Phase 6+)
- Stripe billing automation (we surface invoices, but charging stays manual unless you want Stripe enabled separately)
- Mobile native apps

---

## Suggested execution order for the next few turns

If you approve, I'll implement in this order and stop for review after each:

1. Phase 1 stabilization (UI primitives, RoleGuard, React Query, error boundary)
2. Phase 3 module registry + dynamic sidebar/routes (highest architectural payoff)
3. Phase 5 CBT visual + UX upgrade to match the mockup
4. Phase 4 licensing + per-school CBT config wired into the interface
5. Phase 6 Super Admin + AI + perf

Tell me to start with Phase 1, or pick a different starting phase.
