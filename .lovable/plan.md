## 1. Collapsible sidebar groups (all portals)

Update **`src/layouts/AppLayout.tsx`** (admin / teacher / student / parent) and **`src/layouts/SuperLayout.tsx`** so that any section header that contains **2 or more items** becomes an expandable group with a chevron, while single-item sections render flat (no dropdown noise).

Behaviour:
- Each group has open/closed state, persisted per role+section in `localStorage` (`sidebar:open:<role>:<section>`).
- The group containing the active route is force-opened on navigation so the user never loses sight of where they are.
- "Overview" stays always-open and chevron-less.
- When the sidebar is collapsed to the icon rail, groups collapse to icons only (no chevrons) — the existing collapsed mode is preserved.
- Mobile drawer respects the same open/closed memory.
- Chevron rotates 90° when open; group header is a button (keyboard accessible, `aria-expanded`).

No route, no permission, and no module-registry changes — purely presentational.

## 2. Cross-feature AI cache (cost saver)

Add a **shared cache layer** used by every AI edge function and every file-ingest path. Identical prompts / files are served from cache instead of re-billed.

### New table `public.ai_cache`
| column | purpose |
|---|---|
| `cache_key` (text, PK) | sha-256 of `kind + model + canonical(messages) + scope` |
| `school_id` | tenant scope |
| `kind` | "lesson_plan", "mark_essay", "tutor_reply", "ingest_doc", … |
| `model` | model id used |
| `response` (jsonb) | `{ reply, toolCalls?, extra? }` |
| `tokens_saved`, `cost_saved_usd` | running totals each time the entry is reused |
| `hits` (int) | reuse count |
| `created_at`, `last_used_at`, `expires_at` |

RLS: service-role only (edge functions read/write via service key). Indexed on `(school_id, kind)` and `expires_at` for cleanup.

### New file `supabase/functions/_shared/ai-cache.ts`
Exports:
- `cacheKey(kind, model, messages, scope?)` — canonical JSON + sha-256
- `cacheKeyForFile(kind, model, bytes, extra?)` — hashes file bytes for ingest/transcribe
- `getCached(key)` — returns hit row or null, bumps `hits` & `last_used_at`, and records `tokens_saved`/`cost_saved_usd` (based on the *original* job's usage) via `bump_ai_quota_savings` RPC so dashboards show real savings.
- `putCached(key, schoolId, kind, model, response, usage, costUsd, ttlDays?)`.

Default TTL: 30 days; deterministic kinds (lesson notes, marking rubrics, ingest, transcription) use 90 days; chat-style (`tutor_reply`, `principal_query`) use 7 days. Streamed responses bypass cache.

### Wire into `_shared/ai-call.ts`
At the top of `aiCall()` build the key and call `getCached`. On hit:
- log a `ai_jobs` row with `status='cache_hit'`, `total_tokens=0`, `cost_usd=0`, and copy reply/toolCalls
- return the cached `AiCallResult` immediately

On miss: run the gateway call as today, then `putCached` the result (skip when `stream=true` or `skipCache=true`).

Add `skipCache?: boolean` and `cacheTtlDays?: number` to `AiCallOptions` for callers that need fresh output (e.g. parent digests with date in prompt — those already vary so they naturally miss).

### File-based features
- **`ingest-knowledge`** — before embedding, hash the file bytes; if a `kind='ingest_doc'` cache entry exists for this `(school_id, content_hash)` re-use the existing `knowledge_document_id` + chunks.
- **`mock-result-summary`, `mark-essay`, `generate-report-comment`, `generate-lesson-note`, `generate-lesson-plan`, `generate-parent-digest`, `ai-tutor` non-streaming branch, `principal-copilot`, `rag-search`** — all already route through `aiCall`, so they pick up caching automatically.

### Surfacing savings
Extend the existing AI Activity page query to read `sum(tokens_saved)` and `sum(cost_saved_usd)` from `ai_cache` and show a new "Saved by cache" stat tile alongside the current Tokens / Cost cards.

## Technical details

- All hashing uses the Web Crypto `crypto.subtle.digest('SHA-256', …)` available in Deno edge runtime — no extra deps.
- Canonicalisation: `JSON.stringify` after sorting keys recursively so message ordering changes don't bust the cache, while content changes do.
- Streaming responses (`stream:true`) are skipped because the gateway emits SSE chunks; caching them would require buffering and would break the streaming UX. AI Tutor's typing experience is preserved.
- Migration adds the table, indices, RLS (service-role only), and a tiny `bump_ai_quota_savings(_school_id, _tokens, _cost)` RPC mirroring the existing `bump_ai_quota`.
- No client-facing API change. No new env vars. No new dependencies.

## Out of scope

- No changes to AI model selection, prompts, or any business logic.
- No invalidation UI yet (a 30-day TTL is plenty; manual `DELETE` is one query away if a future prompt change needs a flush).
- Sidebar visual restyle beyond adding the chevron — current colours, spacing, and icons stay identical.
