## Goal

Apply the Improvement Guide PDF (excluding §3 Demo Strategy and §10 CEO Advice — both non-product) to Legacy Schools, reframed around the user's stated 5 core pillars in priority order:

1. **CBT** — internal exams + JAMB/NECO/WAEC simulation
2. **Attendance & student organization**
3. **Digital CA tests, results & report cards**
4. **Online payments & financial management**
5. **AI for teachers, students, and school operations**

Existing product already covers all 5 pillars; this plan is about repositioning, trust, onboarding polish, UX tightening, and infra hygiene — not new modules.

---

## Scope by PDF section

### §1 Homepage Positioning (Landing rewrite)
- Rewrite `src/pages/Landing.tsx` hero around the 5 pillars in the exact priority order above.
- New value-driven headline (problem-led, not feature-led), e.g. "Run exams, attendance, results and fees from one place."
- Above-the-fold primary CTA: **"Request School Onboarding"** + secondary **"Book a Demo"** (mailto/WhatsApp link, no new backend).
- New "How it works" 3-step explainer band (Register school → Onboard staff & students → Run exams/attendance/results/fees).
- 5 pillar cards in priority order with concise copy + icon, replacing generic feature grid.

### §2 Trust & Credibility (Landing additions)
- "Trusted by" logo strip (placeholder slots — admin-editable later; for now use static demo logos).
- Founders / About section with mission statement.
- Support block: email, WhatsApp, response-time SLA (e.g. "We respond within 4 working hours").
- Privacy & Data Protection short section linking to a new `/privacy` page summarizing: encryption at rest, daily automated backups, role-based access, GDPR-style data deletion on request.
- Testimonials section (2–3 placeholder cards, structured so real ones drop in later).

### §4 UI/UX Improvements
- Mobile audit pass on the highest-traffic pages only (Landing, AppLayout sidebar, MockRunner, Results, Fees). Fix any horizontal overflow, ensure tap targets ≥ 44px, collapse tables to cards under `sm`.
- Standardize spacing scale and typographic rhythm via existing tokens in `index.css` / `tailwind.config.ts` (no new tokens unless missing).
- Trim visual clutter on Admin Dashboard: keep only the stats that map to the 5 pillars.

### §5 Features to Prioritize (re-surface in nav)
- Reorder admin sidebar in `AppLayout.tsx` to reflect pillar priority: Exams/CBT → Attendance → Results → Fees → AI tools → everything else.
- Make sure each pillar has a clear, single entry point from the Admin Dashboard (quick-action tiles).

### §6 Features To Add Later
- Document only — add a `docs/ROADMAP.md` listing biometric attendance, mobile app, public APIs, advanced analytics. No code.

### §7 School Onboarding Process
- Extend existing `src/pages/admin/Onboarding.tsx` with a **checklist sidebar** showing progress (Profile → Classes → Subjects → Invite staff → Import students → Done).
- Add "Need help?" panel inside onboarding linking to `/help` and a WhatsApp support handle.
- Add a post-onboarding "Pilot discount" banner on the admin dashboard (dismissible, stored in `schools.settings`).

### §8 Sales & Outreach
- Add WhatsApp click-to-chat floating button on Landing only (uses configured number, no backend).
- Add `/refer` page: simple referral form (school name + contact) that posts to existing `notify-recipients` edge function or a new lightweight insert into a `referrals` table.
- **Decision needed**: build referrals table now, or just mailto for v1? Default to **mailto for v1** to keep scope tight.

### §9 Technical Infrastructure
- Add an admin-visible "System Health" card on super dashboard (uptime, last backup time) — read-only, sourced from existing `auth_events` / a new `system_status` view. Defer if not trivial.
- Audit RLS coverage on the 5 pillar tables (exams, attendance, results, invoices, ai_chats) — no changes expected, just a documented checklist in `docs/E2E_CHECKLIST.md`.
- Document backup policy in `docs/INFRA.md` (Lovable Cloud handles automated backups; document RPO/RTO expectations).

---

## Out of scope (explicitly)

- §3 Product Demo & Conversion — skipped per user request.
- §10 CEO-Level Strategic Advice — skipped per user request.
- No new pillar modules. No biometric, no mobile app, no public API.
- No payment provider switch (Paystack stays).

---

## File touches (estimate)

**Edited**
- `src/pages/Landing.tsx` (major rewrite — hero, pillars, trust, about, support, testimonials, WhatsApp FAB)
- `src/layouts/AppLayout.tsx` (sidebar reorder by pillar priority)
- `src/pages/admin/Dashboard.tsx` (pillar quick-actions, pilot banner)
- `src/pages/admin/Onboarding.tsx` (checklist sidebar, help panel)
- `src/pages/student/MockRunner.tsx`, `src/pages/admin/Payments.tsx`, `src/pages/parent/Fees.tsx` (mobile pass only)

**Created**
- `src/pages/Privacy.tsx` + route in `App.tsx`
- `src/pages/Refer.tsx` + route (mailto-based v1)
- `src/components/landing/WhatsAppFab.tsx`
- `src/components/landing/PillarsSection.tsx`
- `src/components/landing/TrustSection.tsx`
- `docs/ROADMAP.md`, `docs/INFRA.md`

**No database migrations** unless we promote referrals to a real table (deferred).

---

## Questions before build

1. **Support contact**: what WhatsApp number + support email should I hardcode on Landing/Help/Refer? (or a placeholder I'll mark `TODO`?)
2. **Pilot discount banner**: real offer text + expiry, or generic "Pilot pricing available — contact us"?
3. **Referrals**: confirm mailto-only for v1, or build a real `referrals` table + admin inbox?
4. **Testimonials**: any real pilot-school quotes to use, or keep tasteful placeholders labelled "Coming soon — pilot school"?

Once these are answered I'll switch to build mode and ship in one pass.
