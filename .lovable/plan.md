## What we're building

Three coordinated pieces of feature work:

1. **AI Tutor 2.0** — A sleek, ChatGPT-style study companion with persistent conversations, voice input, file uploads, and four built-in study skills. Available in both student and teacher portals.
2. **Messaging upgrades** — Voice notes + file attachments in direct messages (student, teacher, parent).
3. **Exam Review mode** — After submitting an exam/mock, students get a question-by-question review with correct answers and an AI explanation.

---

## 1. AI Tutor 2.0

### Conversation history
- New table `ai_conversations` (id, school_id, user_id, title, last_message_at, pinned, archived) replaces the flat `ai_chats` log.
- Extend `ai_chats` with `conversation_id`, `attachments jsonb`, `audio_url`. Backfill existing rows into a single "Legacy chat" conversation per user.
- Left rail (collapsible on mobile) lists conversations grouped by Today / Previous 7 days / Older, with rename/delete/pin. Auto-titles after the first AI reply (tutor returns a 4-word title via tool call).

### ChatGPT-style UI
- Full-bleed chat surface, centered max-width column, sticky composer.
- Streaming responses via SSE (rewrite the `ai-tutor` edge function to stream); typing indicator becomes a live cursor.
- Markdown + code-block rendering with `react-markdown` + syntax highlight.
- Suggested-prompt cards on empty state ("Explain photosynthesis", "Quiz me on algebra", "Plan my study week").
- Stop-generating button, regenerate last response, copy-to-clipboard on each message.

### Voice notes (input)
- Mic button in the composer records audio with `MediaRecorder` (webm/opus).
- Uploaded to a new private storage bucket `tutor-uploads` under `{user_id}/{conversation_id}/...`.
- Transcribed server-side via Lovable AI Gateway (`google/gemini-2.5-flash` with audio input). Transcript is shown as the user message; original audio playable inline.

### File uploads
- Paperclip button accepts PDF / image / txt / docx (≤ 10 MB).
- PDFs are parsed to text on the server (PDF.js in the edge function) before being sent to the model; images are passed as multimodal input.
- Files render as cards in the user message and remain downloadable.

### Study-companion skills (system tools)
Backend system prompt + tool schema gives the tutor four named skills it can invoke:
- **Quiz me** — generates 5-question MCQ on a topic, grades inline.
- **Summarize my notes** — operates on the latest uploaded PDF/image and returns summary + flashcards.
- **Explain my last exam** — fetches the student's most recent `exam_attempts` / `mock_sessions` row, walks through wrong answers.
- **Plan my study week** — pulls the student's enrolled subjects + upcoming `exams.scheduled_at`, returns a Mon–Sun schedule.

### Teacher access
- New route `teacher/AITutor.tsx` (renders the same component with a teacher-flavored system prompt: lesson planning, rubric drafting, exam-question generation, parent-comm wording).
- Added to the teacher sidebar.

---

## 2. Messaging upgrades (student + teacher + parent)

All three portals already render `MessagesPanel`, so this is one component change.

- Composer gets paperclip and mic buttons matching the tutor.
- Voice notes uploaded to a new private bucket `message-attachments`; messages store an `attachments` array (`{type:'audio'|'file'|'image', url, name, size, duration}`).
- Bubbles render audio with a play/scrub UI, images with a lightbox, files as download cards.
- Migration adds `attachments jsonb default '[]'` to `public.messages` (the lightweight DM table — the richer `conversation_messages` table already has the column).

---

## 3. Exam review mode

- New `student/ExamReview.tsx` route, linked from results pages and from the submit-success screen.
- Loads `exam_attempts` + answers; new SECURITY DEFINER RPC `get_exam_review(_attempt_id)` returns each question with `correct_index`, `selected_index`, `explanation` (only after submission, only for the owner / teacher / admin).
- For each question: show prompt, options highlighted (green correct / red wrong), and a collapsible "Why?" panel that calls `ai-tutor` with a focused prompt to explain that specific question.
- Same review screen for mocks via a parallel `get_mock_review(_session_id)` RPC.

---

## Technical details

### Database migration
```sql
-- conversations for tutor
CREATE TABLE public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  user_id uuid not null,
  title text not null default 'New chat',
  pinned boolean not null default false,
  archived boolean not null default false,
  last_message_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO authenticated;
GRANT ALL ON public.ai_conversations TO service_role;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner rw" ON public.ai_conversations
  FOR ALL USING (user_id = auth.uid() AND public.is_member(school_id, auth.uid()))
  WITH CHECK   (user_id = auth.uid() AND public.is_member(school_id, auth.uid()));

ALTER TABLE public.ai_chats
  ADD COLUMN conversation_id uuid REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  ADD COLUMN attachments jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN audio_url text;

ALTER TABLE public.messages
  ADD COLUMN attachments jsonb NOT NULL DEFAULT '[]';

-- exam review RPCs (SECURITY DEFINER, owner/teacher/admin only)
CREATE FUNCTION public.get_exam_review(_attempt_id uuid) RETURNS TABLE(...) ...;
CREATE FUNCTION public.get_mock_review(_session_id uuid) RETURNS TABLE(...) ...;

-- storage buckets
INSERT INTO storage.buckets (id,name,public) VALUES
  ('tutor-uploads','tutor-uploads',false),
  ('message-attachments','message-attachments',false);
-- per-user folder policies on storage.objects for both buckets
```

### Edge functions
- Rewrite `ai-tutor` to stream SSE, accept `conversation_id` + `attachments`, support tool calls for the 4 study skills, and persist user + assistant messages server-side (so streaming + history stay consistent).
- New `transcribe-audio` function: takes a signed storage path, returns transcript text via Lovable AI Gateway.

### Frontend
- `src/pages/student/AITutor.tsx` rebuilt; new `src/pages/teacher/AITutor.tsx` (thin wrapper).
- New `src/components/tutor/` directory: `ConversationList`, `ChatSurface`, `Composer`, `VoiceRecorder`, `AttachmentChip`, `MessageBubble`.
- `MessagesPanel` composer extended with the same `Composer`/`VoiceRecorder` primitives.
- `src/pages/student/ExamReview.tsx` + route wiring; "Review" button on results pages.
- Add `react-markdown` + `remark-gfm` + `rehype-highlight`.

### Out of scope (this round)
- Group AI chats / sharing conversations
- Tutor "deep research" web browsing
- Realtime voice (speech-to-speech) — only voice notes
- Editing/regenerating arbitrary past messages (only the most recent assistant reply)
