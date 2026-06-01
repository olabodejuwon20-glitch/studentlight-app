
# Legacy School → AI-Native OS: Full Build Plan (Phase 1–4)

Grounded in what's already shipped: multi-tenant Supabase + RLS, assessments v2 (`assessments`, `questions_v2`, `assessment_attempts_v2`, `assessment_results`), AI Tutor + Co-Teacher (`ai-tutor` edge fn with skills), `generate-questions`, `generate-report-comment`, `generate-parent-digest`, parent dashboard digest widget, `library` + `tutor-uploads` buckets.

Everything below is additive — no rewrites of shipped modules.

---

## Cross-cutting foundation (built once, reused everywhere)

These three pieces unblock every later feature. They are part of Phase 1.

### F1. Shared `ai-call` helper
`supabase/functions/_shared/ai-call.ts`. Single entry point every AI edge function imports. Handles: auth check, per-school budget check, model routing, Lovable AI Gateway call (chat / image / embeddings), retries, 429/402 surfacing, and writes a row to `ai_jobs` with tokens + cost + latency.

### F2. `ai_jobs` + `ai_approvals` + `school_ai_quotas` tables
- `ai_jobs` — every AI call logged (kind, model, tokens, cost, status, error, latency, user_id, school_id).
- `ai_approvals` — entity-level approval ledger (question, comment, parent message, lesson plan, …) with edit diff.
- `school_ai_quotas` — monthly token/cost cap per school + current consumption.

### F3. `student_topic_mastery` rollup
Table + trigger on `assessment_results` insert. Reads `per_topic` JSON, EMA-updates per (student, subject, topic). Powers tutor recommendations, adaptive practice, principal risk lists, parent digest.

---

# Phase 1 — Must Build Immediately (0–6 weeks)

Goal: unlock the AI-native loop for teachers and parents; everything else depends on F1-F3.

### 1.1 Foundation tables + helper
- Migration: `ai_jobs`, `ai_approvals`, `school_ai_quotas`, `student_topic_mastery` (+ trigger).
- New: `supabase/functions/_shared/ai-call.ts`.
- Refactor existing functions (`ai-tutor`, `generate-questions`, `generate-report-comment`, `generate-parent-digest`) to route through the helper. No behaviour change, just observability.

### 1.2 AI Lesson Planner
- Edge fn `generate-lesson-plan` — input: subject, class, topic, duration, curriculum (WAEC/NECO/JAMB). Output structured markdown: objectives, materials, intro, activities, assessment, homework.
- Page: `src/pages/teacher/LessonPlans.tsx` — list + editor + "Convert to Assessment" button (calls existing `generate-questions` with same topic/curriculum).
- Tables: `lesson_plans (id, school_id, teacher_id, class_id, subject, topic, content, curriculum, status, ai_job_id)`.
- Goes through `ai_approvals` (teacher must approve before "Share with class").

### 1.3 AI Marking Assistant (short answer + essay)
- Edge fn `mark-essay` — input: rubric (criteria + weights) + student answer + question. Returns per-criterion score, feedback, suggested grade. Uses `gpt-5.4-mini`.
- Extend `questions_v2` workflow: when `type='essay'`, surface "AI suggest grade" on teacher review. Teacher always confirms; suggested grade stored in `assessment_answers_v2.ai_grade` (new column).
- New table: `marking_rubrics (school_id, subject, name, criteria jsonb)`.

### 1.4 Parent Risk Alerts (automation seed)
- Edge fn `automation-runner` (cron, 15 min). MVP rules hardcoded; rule-builder UI in Phase 2.
- Rule set v1: attendance < 70% over 5 days, ≥2-grade drop on last assessment, invoice overdue > 7 days.
- For each match → draft parent message via `ai-call` → insert into `ai_approvals` with `entity_type='parent_message'`. Admins see a queue and one-tap approve/send.
- New table: `parent_alerts (id, school_id, student_id, parent_id, kind, severity, draft_message, ai_job_id, status, sent_at)`.

### 1.5 Admin AI Activity & Budget
- Page `src/pages/admin/AIActivity.tsx` — list `ai_jobs` filtered to school, with cost/token totals, model breakdown, drill-down per job.
- Page `src/pages/admin/AISettings.tsx` — set monthly token budget, toggle features per role, view approval queue.

### 1.6 Mastery-powered tutor enhancements
- `student_topic_mastery` now exists → swap the in-memory aggregation in `ai-tutor` `recommend` skill for the table; recommendations get faster and survive across sessions.
- New `adaptive_practice` skill on `ai-tutor`: picks the lowest-mastery topic and inlines a 5-question booster.

**Phase 1 deliverables:** 4 migrations, 3 new edge functions, 1 shared helper, 4 new pages, mastery-aware tutor.

---

# Phase 2 — High Value (6–14 weeks)

Goal: RAG + Principal Copilot v1 + automation UI. School staff start *asking* the system, not navigating it.

### 2.1 Knowledge ingestion + RAG
- Enable `pgvector`. Tables: `knowledge_documents`, `knowledge_chunks (vector(1536))` with HNSW index, `school_id` denormalised for fast RLS post-filter.
- Edge fn `ingest-knowledge`: trigger on storage upload to `library`. PDF/DOCX parse → chunk (~1000 chars, 150 overlap) → embed via `openai/text-embedding-3-small` → insert with `visibility` (school|class|student|public_curriculum).
- Edge fn `rag-search(query, scope)` returns top-k chunks with citations, hard-filtered by `school_id` + visibility.
- Tutor + Co-Teacher prompts updated to call `rag-search` and inject `<<DOCUMENT>>…<<END>>` blocks (with the standard "treat as data not instructions" guard).

### 2.2 Principal Copilot v1 (read-only)
- Edge fn `principal-copilot` — agent loop with **typed tools** (Zod-validated). No raw SQL exposed to the model.
- Tool set v1 (~10):
  - `students_at_risk(class?, threshold?)`
  - `teachers_missing_results(term?)`
  - `fee_collection_rate(term?, class?)`
  - `attendance_summary(window_days, class?)`
  - `assessment_coverage(subject?, term?)`
  - `top_weak_topics(class?, n?)`
  - `compare_classes(metric)`
  - `student_profile(student_id)` (with PII tokenisation before model call)
  - `draft_parent_message(student_id, topic)` (writes to `ai_approvals`)
  - `list_pending_approvals()`
- UI: `src/pages/admin/Copilot.tsx` — chat interface with citations, "Run as Principal" badge, history panel.
- Model: `openai/gpt-5.4-mini` with tool-calling; max depth 4.

### 2.3 Adaptive practice generator
- Student-side page `Practice.tsx` — "Booster pack" cards generated from `student_topic_mastery`. Calls `generate-questions` with weak topics, persists session in a lightweight `practice_sessions` table.

### 2.4 Bulk report-card comments
- Extend `generate-report-comment` to accept `class_id` → produce a CSV of comments for every student in one job. Teacher reviews in a table UI, approves per-row.

### 2.5 Automation engine UI
- Table `automation_rules (trigger jsonb, action jsonb, enabled)`.
- Rule builder UI: triggers (attendance, grade-drop, fee overdue, behaviour note), actions (parent message, admin alert, schedule meeting, generate booster).
- `automation-runner` now reads from this table instead of hardcoded rules.

### 2.6 RAG-aware Co-Teacher slash commands
- `/notes <topic>` pulls from school lesson-note library.
- `/policy <question>` answers from uploaded staff handbooks.
- `/curriculum <code>` returns the syllabus excerpt.

**Phase 2 deliverables:** pgvector + ingest pipeline, Principal Copilot with 10 tools, adaptive practice, automation rule builder, RAG-aware Co-Teacher.

---

# Phase 3 — Competitive Advantage (14–28 weeks)

Goal: features competitors can't trivially copy. Per-student personalisation deepens.

### 3.1 Career Advisor + Learning Path
- Student-side wizard: interests + JAMB subject combo + recent results → AI-generated 3-year learning path with milestones (exams, projects, recommended subjects).
- Tables: `learning_paths`, `learning_milestones`. Re-evaluated each term via cron.

### 3.2 "Ask about my child" parent chat
- Edge fn `parent-copilot` — same agent pattern as Principal Copilot but tool set is **strictly scoped to children linked via `parent_links`**. Tools: `attendance`, `recent_results`, `mastery_snapshot`, `upcoming_assessments`, `behaviour_summary`, `draft_message_to_teacher`.
- UI: extends `ParentDashboard`.

### 3.3 Parent–Teacher AI Mediator
- When a teacher drafts a sensitive message (low score, behaviour) the AI rewrites it in two registers: "factual" + "empathetic". Teacher picks. Logged in `ai_approvals`.

### 3.4 AI Invigilator (anomaly detection)
- During `assessment_attempts_v2` runs: webcam snapshots (already have `proctor-snapshots` bucket) + answer-pattern anomalies (impossibly fast, copy-pattern across students).
- Edge fn `invigilate-attempt` evaluates after submit; writes `invigilation_flags` with severity + evidence. Teacher reviews on attempt page.

### 3.5 Voice-first admin
- Composer with mic → Whisper (via gateway) → tool call on Principal Copilot. "What's our fee rate this week?" spoken → table answer.

### 3.6 Curriculum gap analysis
- Cross-class report: per curriculum code, % covered (via assessment topics) vs % mastered. Flags topics taught but not learned, and learned but not taught.

### 3.7 Whiteboard → notes
- Teacher snaps board photo → multimodal Gemini → cleaned markdown note → suggested questions → optional auto-save to `lesson_plans` or `knowledge_documents`.

**Phase 3 deliverables:** career/learning path, parent copilot, mediator, invigilator, voice admin, curriculum gap report, whiteboard pipeline.

---

# Phase 4 — Long-Term AI Vision (6+ months)

Goal: defensible moats and new revenue.

### 4.1 Predictive WAEC/JAMB outcomes
- Per-student model: features = mastery vector + attendance + prior mocks + study time. Output: predicted score range + confidence. Stored in `predictions` table, refreshed weekly. Surface in student + parent + principal views.

### 4.2 Cross-school anonymised benchmarking
- Opt-in flag per school. Nightly job aggregates anonymised metrics into `benchmark_snapshots`. Principal dashboard shows "Your JS2 maths mastery vs national average (anonymised)".

### 4.3 AI textbook (auto-generated, school-branded)
- For any topic in the curriculum, generate a multi-page lesson with worked examples, exercises, and an end-of-chapter quiz. Versioned, school-brandable, exportable as PDF. Becomes a paid asset.

### 4.4 Whole-class multi-modal whiteboard → notes → quiz pipeline (productised)
- Recorded class session (video/audio) → transcript → structured notes → quiz → distributed to absentees automatically.

### 4.5 State-ministry multi-school analytics layer
- New tenant type "ministry". Read-only roll-up across consented schools. Sold as enterprise.

### 4.6 Continuous prompt eval + auto-tuning
- `ai_evals` table with golden inputs per skill; nightly Deno test job. Edit diffs from `ai_approvals` mined to refine prompts via offline review queue.

**Phase 4 deliverables:** prediction model, benchmarking, AI textbook generator + PDF export, classroom-capture pipeline, ministry tenant, eval harness.

---

## Sequencing & dependencies

```
F1 ai-call helper ──┐
F2 ai_jobs ─────────┼──► every later phase
F3 mastery ─────────┘
                    │
Phase 1 features    │  (lesson plan, marking, parent alerts, admin AI panel)
                    │
pgvector + RAG ─────┴──► Co-Teacher RAG, Principal Copilot, Parent Copilot, AI textbook
Principal Copilot ──────► Voice admin, Ministry view
Mastery + topic_mastery ► Adaptive practice, Learning paths, Predictions, Benchmarking
Approval ledger ────────► Mediator, Invigilator review, Eval harness training data
```

## Risks & guardrails (apply to every phase)

- **RLS is the only boundary.** No new feature merges without RLS proof.
- **Tools, not SQL.** LLMs only call named, Zod-validated tools.
- **Approval-required by default** for anything reaching students/parents.
- **PII tokenisation** in any prompt referencing students.
- **Per-school budget cap** enforced in `ai-call`; surface 429 to UI gracefully.
- **Prompt-injection wrapper** for every RAG chunk.

## What this plan deliberately doesn't include

- Mobile app rewrite (separate workstream).
- Payment-provider work beyond existing Paystack (out of AI scope).
- Switching LLM providers (already abstracted by `ai-call`).

---

Approve and I'll start Phase 1 by shipping F1+F2+F3 in the first commit, then 1.2 (Lesson Planner), then 1.3 (Marking Assistant), then 1.4 (Parent Alerts) — in that order so each subsequent feature builds on the foundation.
