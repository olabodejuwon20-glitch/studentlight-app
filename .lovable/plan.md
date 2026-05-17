
# Super Admin — Platform Operating System

A standalone, enterprise-grade control center at `/super` that sits above every onboarded school. Designed to feel like Stripe / Linear / Vercel: spacious, monochrome with one strong accent, premium typography (Inter Tight + Geist Mono), soft shadows, dense data tables, and confident charts. Completely separate from the existing school portals.

## Access

- New `app_role` value `super_admin`. Bootstrap link `/super/claim` works only while zero super-admins exist, then locks forever.
- All `/super/*` routes guarded by `<SuperAdminGuard>`; non-admins are redirected.
- Every state-changing action goes through edge functions running with the service-role key and writes an immutable audit row.

## Layout

```text
┌───────────────────────────────────────────────────────────┐
│  ⌘K  EduSmart OS         search…       env • help • user  │  sticky topbar
├──────┬────────────────────────────────────────────────────┤
│ nav  │  page content (max-w-7xl, generous padding)         │
│ rail │                                                    │
└──────┴────────────────────────────────────────────────────┘
```

- Left rail: collapsible (72px ↔ 248px), grouped nav (Overview / Tenants / Catalog / Revenue / Ops / Platform).
- Topbar: global search, environment badge (Live / Sandbox), keyboard-shortcut hint, profile menu.
- Shared primitives: `PageHeader`, `MetricCard`, `DataTable` (sortable + filterable + column toggle + CSV export), `EmptyState`, `Skeleton`, `Chart` wrappers (Recharts), `ConfirmDialog`.

## Pages (route map)

| Route | Page |
|---|---|
| `/super` | Dashboard (8 KPI cards, 4 charts, 6 widgets) |
| `/super/schools` | Schools table + filters |
| `/super/schools/:id` | School detail (tabs: Profile, Analytics, Modules, Configuration, Billing, Support, Activity, Security) |
| `/super/modules` | Module registry (cards + table view) |
| `/super/modules/:slug` | Module detail + version history + assigned schools |
| `/super/licensing` | Feature licensing matrix (schools × modules) |
| `/super/configurations` | Tenant configuration center (pick school → module → config) |
| `/super/marketplace` | Public-facing module catalog preview + install requests |
| `/super/subscriptions` | Plans, MRR/ARR, churn, expiring soon, upgrade flow |
| `/super/billing` | Invoices, payments, failed charges, revenue by module |
| `/super/users` | All users across tenants, role management, force logout |
| `/super/announcements` | Compose + schedule + target |
| `/super/tickets` | Support tickets kanban + detail drawer |
| `/super/analytics` | Deep analytics (growth, engagement, adoption, revenue) |
| `/super/security` | Suspicious logins, sessions, impersonation log, maintenance mode |
| `/super/logs` | Searchable system logs with filters + export |
| `/super/settings` | Branding, SMTP, integrations, API keys, payment gateways |
| `/super/claim` | One-time bootstrap |

## Technical Details

### Schema (single migration)

```sql
-- Roles
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Plan + status on schools
CREATE TYPE public.school_plan   AS ENUM ('trial','basic','standard','premium','enterprise');
CREATE TYPE public.school_status AS ENUM ('active','suspended','expired','trial');

ALTER TABLE public.schools
  ADD COLUMN plan           public.school_plan   NOT NULL DEFAULT 'trial',
  ADD COLUMN status         public.school_status NOT NULL DEFAULT 'trial',
  ADD COLUMN plan_started_at  timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN plan_expires_at  timestamptz,
  ADD COLUMN branding         jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN platform_notice  text,
  ADD COLUMN suspended_reason text;

-- Module registry (global catalog)
CREATE TABLE public.modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  category text NOT NULL,        -- 'academics' | 'operations' | 'ai' | 'communication' | 'finance'
  version text NOT NULL DEFAULT '1.0.0',
  icon text,                     -- lucide name
  status text NOT NULL DEFAULT 'active',   -- active | beta | archived
  global_default boolean NOT NULL DEFAULT false,
  pricing_model text NOT NULL DEFAULT 'included', -- included | addon | metered
  monthly_price_cents int NOT NULL DEFAULT 0,
  default_config jsonb NOT NULL DEFAULT '{}',
  config_schema jsonb NOT NULL DEFAULT '{}', -- drives the dynamic config form
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Per-school licensing + configuration (merged)
CREATE TABLE public.school_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.modules(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT true,
  beta boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}',           -- overrides module.default_config
  enabled_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  UNIQUE (school_id, module_id)
);

-- Subscriptions & invoices (records, not a payment processor)
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  plan public.school_plan NOT NULL,
  status text NOT NULL DEFAULT 'active',        -- active | canceled | past_due
  started_at timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz,
  monthly_amount_cents int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  number text NOT NULL,
  amount_cents int NOT NULL,
  status text NOT NULL DEFAULT 'open',          -- open | paid | failed | void
  issued_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  line_items jsonb NOT NULL DEFAULT '[]'
);

-- Announcements (platform-wide)
CREATE TABLE public.platform_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  priority text NOT NULL DEFAULT 'normal',      -- normal | high | critical
  audience text NOT NULL DEFAULT 'all',         -- all | plan | schools
  target jsonb NOT NULL DEFAULT '{}',           -- {plans:[], school_ids:[]}
  scheduled_for timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Support tickets
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid REFERENCES public.schools(id),
  opened_by uuid NOT NULL,
  subject text NOT NULL,
  priority text NOT NULL DEFAULT 'medium',      -- low | medium | high | critical
  status text NOT NULL DEFAULT 'open',          -- open | in_progress | resolved | closed
  assignee uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author uuid NOT NULL,
  body text NOT NULL,
  internal boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Module requests from schools
CREATE TABLE public.module_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id),
  requested_by uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'pending',       -- pending | planned | building | shipped | rejected
  module_id uuid REFERENCES public.modules(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Audit log (everything the super admin does)
CREATE TABLE public.platform_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor uuid NOT NULL,
  school_id uuid,
  action text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}',
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Security: failed logins / suspicious activity
CREATE TABLE public.security_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid,
  user_id uuid,
  type text NOT NULL,                           -- failed_login | suspicious_ip | impersonation | force_logout | session_revoked
  detail jsonb NOT NULL DEFAULT '{}',
  ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Platform settings (singleton row)
CREATE TABLE public.platform_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  brand jsonb NOT NULL DEFAULT '{}',
  smtp jsonb NOT NULL DEFAULT '{}',
  integrations jsonb NOT NULL DEFAULT '{}',
  maintenance_mode boolean NOT NULL DEFAULT false,
  maintenance_message text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Helper + RLS
CREATE OR REPLACE FUNCTION public.is_super_admin(_user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=_user AND role='super_admin');
$$;

-- Enable RLS + policies: super admins read/write all on the new tables;
-- school members read their own school_modules / invoices / subscriptions / announcements.
-- Existing school tables get additive "super admin can read/update" policies.
```

### Edge functions

- `super-action` — single dispatch endpoint for all state-changing super-admin operations (`set_plan`, `suspend_school`, `reactivate_school`, `delete_school`, `assign_module`, `revoke_module`, `update_module_config`, `publish_module`, `archive_module`, `assign_ticket`, `resolve_ticket`, `broadcast_announcement`, `force_logout`, `toggle_maintenance`, …). Verifies super-admin role from JWT, uses service-role client, writes `platform_audit`.
- `super-impersonate` — issues a short-lived magic link for any school admin; logs to `security_events` + `platform_audit`.
- `super-metrics` — aggregates dashboard KPIs in one round-trip.

### Frontend structure

```text
src/
  layouts/SuperLayout.tsx
  components/super/
    SuperSidebar.tsx
    SuperTopbar.tsx
    MetricCard.tsx
    DataTable.tsx
    Chart.tsx           # Recharts wrappers (area, bar, donut, sparkline)
    ConfigForm.tsx      # renders from module.config_schema (toggle/slider/select/number/text)
    EmptyState.tsx
    StatusBadge.tsx
    ConfirmDialog.tsx
  pages/super/
    Claim.tsx
    Dashboard.tsx
    Schools.tsx
    SchoolDetail.tsx
    Modules.tsx
    ModuleDetail.tsx
    Licensing.tsx
    Configurations.tsx
    Marketplace.tsx
    Subscriptions.tsx
    Billing.tsx
    Users.tsx
    Announcements.tsx
    Tickets.tsx
    Analytics.tsx
    Security.tsx
    Logs.tsx
    Settings.tsx
  lib/super.ts           # typed RPC wrapper around super-action
```

- Design tokens added to `src/index.css`: dedicated `--super-*` scale (paper background, near-black ink, single indigo accent, slate borders, very soft shadows). Topbar uses subtle backdrop blur. Tables: 13px body, tabular-nums, sticky header, zebra-free, row hover ring.
- All lists use Suspense-style skeletons; all destructive actions go through `ConfirmDialog` with typed-name confirmation; all mutations toast via `sonner`.

### Module behavior (how schools see this)

- The existing `AppLayout` will read `school_modules` for the resolved school and:
  - Hide sidebar items whose underlying module is disabled.
  - Show a "Subscription paused" full-screen when `schools.status` is `suspended` / `expired`.
  - Show `schools.platform_notice` as a banner when set.
- Module config (e.g. CBT settings) is read via a typed helper `useModuleConfig('cbt')`; existing exam/proctoring code reads from this instead of hardcoded values, so the same module behaves per-tenant.

### Seeding

A small `seed-modules` SQL block in the migration registers the starter modules: `cbt_sim`, `ai_tutor`, `virtual_lab`, `hostel`, `waec_practice`, `e_library`, `transport`, `attendance_pro`, `ai_grading`, `video_learning` — each with realistic `config_schema` (toggles, sliders, dropdowns) and category/icon, so every page has content from day one.

## Build phases (each is one commit, independently shippable)

1. **Foundation** — migration + `super_admin` role + `/super/claim` + `SuperLayout` + `SuperSidebar` + `SuperTopbar` + shared primitives + Dashboard with live KPIs.
2. **Tenants** — Schools list + filters + actions, School Detail (Profile, Analytics, Modules, Config, Billing, Support, Activity, Security tabs), suspend/reactivate/delete/impersonate.
3. **Catalog** — Modules registry + Module Detail + Licensing matrix + Configurations center with dynamic schema-driven forms + Marketplace preview + module requests inbox.
4. **Revenue** — Subscriptions, Billing, invoice list, expiring-soon, plan upgrade flow, revenue charts.
5. **Ops** — Announcements composer, Support tickets kanban + drawer, Users & Roles, force-logout.
6. **Platform** — Security Center, System Logs, Analytics deep-dive, Platform Settings, maintenance mode.

## Out of scope (follow-ups)

- Real payment processor integration (Stripe/Paddle) — current build records invoices and plans but does not charge cards.
- Pushing actual module code at runtime — modules are feature flags + config, not remote JS bundles.
- Multi-region / data residency controls.
- White-label reseller hierarchy beyond one super-admin tier.

### Files

**Created** — migration, 3 edge functions, `src/layouts/SuperLayout.tsx`, ~9 components under `src/components/super/`, ~17 pages under `src/pages/super/`, `src/lib/super.ts`.

**Edited** — `src/App.tsx` (mount `/super/*`), `src/lib/tenant.ts` (reserve `super`), `src/contexts/SchoolContext.tsx` (expose `modules` + `isModuleEnabled` + `isSuspended`), `src/layouts/AppLayout.tsx` (suspension screen + notice banner + module-aware sidebar).
