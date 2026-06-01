
# Enhance Student AI Tutor — Step-by-step, Quiz Follow-ups, Curriculum Recommendations

The tutor already streams chat and has four skills (quiz, summarize, explain_exam, plan_week). This adds three capabilities on top of that foundation without rewriting it.

---

## 1. Step-by-step explanations

A new `explain_steps` skill + a "Show steps" toggle on the composer.

- **Edge function:** new branch in `supabase/functions/ai-tutor/index.ts` for `skill: "explain_steps"`. Prompt asks the model to return numbered scaffolded steps with: goal → key idea → worked example → "your turn" check question → common mistake.
- **Inline action:** on any assistant message, a small "Break this down step-by-step" chip that re-runs the previous user question through `explain_steps` with the assistant's last answer as context.
- **Empty-state suggestion** added: "Walk me through quadratic equations step by step".

## 2. Quiz follow-ups after an answer

After every assistant response, render 2–3 contextual follow-up chips under the bubble:

- "Quiz me on this" → runs the existing `quiz` skill with the topic extracted from the last exchange.
- "Try a harder one" → re-runs quiz with `difficulty: "hard"`.
- "Explain like I'm 12" → runs `explain_steps` with `level: "simple"`.

Implementation:
- New `MessageBubble` prop `actions?: { label, onClick }[]`, rendered as ghost chips below the assistant bubble.
- `TutorChat` computes follow-ups for the *last* assistant message only (not historical ones, to keep it clean).
- Topic extraction: take the last user message's first 80 chars; the model handles the rest.

## 3. Curriculum-tied study recommendations

A new `recommend` skill that grounds suggestions in the student's actual data.

- **Server-side context** (`ai-tutor`, new skill branch): pull, scoped to `auth.uid()` + `school_id`:
  - Enrolled subjects via `class_enrollments` → `classes(subject, grade_level)`
  - Recent results (`results` table, last 20)
  - Per-topic mastery from latest `assessment_results.per_topic` rows (last 5 attempts)
  - Upcoming `exams` in the next 14 days
- **Prompt** asks for: top 3 priority topics, why (cited from the data), one concrete next action per topic (e.g. "10-question booster", "re-read note X", "watch a 5-min recap"), and links back to existing tutor skills.
- **Surface points:**
  - Empty-state suggestion: "What should I study next?".
  - A persistent "Recommended for you" chip in the composer suggestion row when the student has at least one submitted assessment.
- **System prompt update:** append a short "curriculum awareness" paragraph to `STUDENT_SYS` so even free-form chat references the student's level/subjects when known. Inject a one-line "Student context: subjects=…, level=…" into the chat path when available.

---

## Files touched

- `supabase/functions/ai-tutor/index.ts` — add `explain_steps` and `recommend` skills; helper `loadStudentContext(admin, user_id, school_id)` used by both `recommend` and the default chat path; expand the `quiz` prompt to accept `difficulty` and `level`.
- `src/components/tutor/TutorChat.tsx` — wire new skills, compute follow-up actions for the latest assistant message, add new empty-state suggestion, "Show steps" toggle in composer area.
- `src/components/tutor/MessageBubble.tsx` — render optional `actions` chip row under assistant bubbles.
- `src/components/tutor/Composer.tsx` — optional small "Step-by-step" toggle button that, when on, routes the next send through `explain_steps`.

No database changes. No new tables. Everything uses existing tables (`class_enrollments`, `results`, `assessment_results`, `exams`, `ai_chats`, `ai_conversations`) and RPCs.

---

## Out of scope (call out for next iteration)

- A `student_topic_mastery` rollup table (already noted in the Wave 2 roadmap) would make recommendations faster and remembered across sessions — skipped here so this stays additive.
- Voice replies / TTS — noted in Wave 1, not in this scope.
- Pulling textbook content via RAG — Wave 3 work.

Approve and I'll ship.
