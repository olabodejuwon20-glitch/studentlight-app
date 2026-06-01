
# AI Across Legacy School — Feature Roadmap

You already have four AI surfaces shipped: AI Tutor (student + teacher chat), AI question generation, AI lesson notes, and voice-note transcription. This plan extends AI into every daily workflow — learning, teaching, and management — organized into three implementation waves so we can ship value continuously without bloating scope.

Everything below runs on **Lovable AI Gateway** (no extra API keys) via edge functions, reuses existing tables where possible, and respects multi-tenant RLS.

---

## Guiding principles

1. **AI assists, humans decide.** Every AI output that affects grades, fees, or parent communication is reviewable and editable before it goes live.
2. **Use the cheap model by default** (`google/gemini-3-flash-preview`), reserve `gpt-5` / `gemini-2.5-pro` for heavy reasoning (term comments, multi-source analysis).
3. **One edge function per use case.** Prompts live server-side; the client only ships intent and context.
4. **Every AI write goes through a review queue** (we already established this pattern with `questions_v2.ai_generated / approved_by`).

---

## Wave 1 — Quick wins (1–2 weeks of work)

Features that reuse existing data + the AI patterns we've already built.

### Students
- **Adaptive practice from your weak topics.** After each submitted attempt, read `assessment_results.per_topic`; the tutor offers "10-question booster on Quadratic Equations" with one click → calls `generate-questions` into a private `ai_assessment` for that student.
- **"Explain my last exam" deep-dive.** On `ExamReview`, an inline AI button per wrong question that streams an explanation grounded in the question + the student's selected answer (using `ai-tutor` with a structured prompt).
- **Voice Q&A.** Tutor mic button already transcribes — add **TTS playback** of replies (Gemini Flash voice) for accessibility and primary-school students.
- **Study plan generator.** "Plan my study week" composer action → produces a calendar of topics drawn from upcoming `assessments` + weakest topics; writes ICS-style events into existing `calendar_events`.

### Teachers
- **AI lesson plan → assessment in one click.** From `LessonPlan` / `LessonNotes`, "Generate matching test" calls `generate-questions` pre-filled with topic/subject/level → drops into an `ai_assessment` draft for review.
- **Smart marking for essays / short answers.** Extend `submit_assessment` to flag `essay` / `short` questions → new `grade-open-answer` edge function returns suggested score + rubric-style feedback; teacher approves in `Grading`.
- **Parent message drafter.** In `ParentComms`, "Draft a message" uses the student's recent attendance/behavior/results to produce a warm, factual update the teacher edits and sends.
- **Co-teacher in context.** AI Co-Teacher already exists — add **slash commands**: `/scheme`, `/rubric`, `/quiz`, `/parent-note` that pre-fill the prompt.

### Admins
- **Bulk-roster cleanup.** On `BulkUpload`, AI normalizes inconsistent names, splits "Surname, Firstname", detects duplicate students, and proposes a fix list to approve.
- **Announcement composer.** AI rewrites a one-line idea into three tones (formal / friendly / urgent) before broadcasting.
- **Fee-defaulter outreach.** From `Fees`, AI drafts polite, parent-specific reminder messages referencing the actual outstanding line items.

### Parents
- **"What did my child do this week?"** A weekly AI digest summarizing attendance, behavior notes, new grades, and upcoming assessments — surfaced on `parent/Dashboard` and optionally emailed.

---

## Wave 2 — Deeper AI loops (2–4 weeks)

Features that need a small amount of new schema or background jobs.

### Learning intelligence
- **Mastery model per student.** Roll `assessment_results.per_topic` into a `student_topic_mastery` table updated on every submission. Tutor, practice, and study planner all read from it.
- **Personalized homework.** Teacher creates an assignment with a topic + level; system generates a unique question set per student based on mastery (low mastery → easier scaffolded items; high mastery → stretch problems).
- **AI study buddy with memory.** Tutor remembers what a specific student is currently studying (subject, recent mistakes, exam dates) across conversations using a lightweight `tutor_memory` table.

### Teaching automation
- **Scheme-of-work generator.** Input curriculum + term length → produces a week-by-week scheme with topics, objectives, suggested activities, and ready-to-publish lesson notes; admin-reviewable.
- **AI-graded essays at scale.** Batch grading: teacher uploads/scans, AI proposes scores with margin notes; teacher confirms in a 1-keystroke flow.
- **Behavior pattern detector.** Weekly job reads `behavior_notes` + attendance and flags students whose pattern is shifting (escalation or improvement) for the form teacher.

### Management & ops
- **Term-end report-comment writer.** For each student per subject, generate a personalized comment using their term results and behavior notes; drops into the existing report-card slip flow for the teacher/admin to edit.
- **Timetable assistant.** Given teachers, subjects, room constraints → AI proposes a conflict-free weekly timetable; admin tweaks visually.
- **Anomaly watcher.** AI scans daily attendance + fees + violations data and alerts admin to outliers ("Class JSS2A attendance dropped 18% this week").

### Parents
- **Two-way AI mediator.** When a parent messages a teacher in another language, AI translates in-thread (already-supported attachments + translate prompt).
- **"Ask about my child."** Parent-only chat scoped to *their child's* records — answers grounded only in the data they're allowed to see (uses RLS-aware retrieval pattern).

---

## Wave 3 — Differentiators (4+ weeks)

Bigger bets that turn the platform into a true AI school OS.

- **Document understanding (RAG).** Library uploads (PDF textbooks, past papers) are chunked + embedded with `google/gemini-embedding-001` into a `library_embeddings` table; tutor answers cite specific pages from the school's own library.
- **Whiteboard-to-notes.** Teacher snaps a photo of a chalkboard; AI extracts text/math and converts to a clean lesson note + auto-tags topics.
- **Predictive analytics.** "Who is at risk of failing this term?" — a model over grades, attendance, behavior produces a ranked list with the top contributing factors per student.
- **Curriculum gap analysis.** Compare what teachers actually covered (lesson notes) vs the scheme of work, and flag missed topics before exams.
- **AI invigilator.** Optional camera + screen-blur during proctored mocks; AI flags suspicious motion/multiple faces and writes to `assessment_violations_v2`.
- **Voice-first admin.** Admin says "show me JSS2 fees this term" or "send a reminder to defaulters" — AI routes the intent to the correct page / RPC.

---

## Cross-cutting work needed once

These pay back across many features and are worth doing early (start of Wave 2):

- **`ai_jobs` table + worker pattern** for any AI task that takes >5s (batch grading, weekly digests, embeddings) so the UI stays snappy.
- **`student_topic_mastery` rollup** — feeds Wave 2 personalization.
- **Shared retrieval helper** (`get_student_context(user_id)`) used by tutor, parent digest, report comments — single source of truth for "what the AI knows about a student".
- **Approval audit trail.** Every AI-generated artifact (question, comment, message) records `ai_generated=true` + `approved_by`/`approved_at` so admins can audit.

---

## What I recommend we build first

If you want maximum visible impact with one focused sprint, ship these four:

1. **Adaptive practice from weak topics** (student-facing, demoable in minutes)
2. **AI lesson plan → assessment in one click** (saves teachers hours/week)
3. **Term-end report-comment writer** (the killer admin feature parents see)
4. **Parent weekly digest** (visible value to parents → drives engagement)

Tell me which wave (or which specific bullets) you want me to scope into a build plan next, and I'll turn it into the migration + edge-function + UI work.
