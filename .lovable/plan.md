## Goals

1. Make the **Download Result Slip** button a prominent, responsive CTA on the student Results screen.
2. Give students control on the **NECO/JAMB Mock** picker: choose how many questions per subject, and opt in to full‑screen (no longer forced on by default).
3. Add a **post‑submission Result page** for mock attempts (JAMB & NECO) with a detailed AI summary plus per‑question AI explanations.
4. Hide **School Exam results** from students/parents until the school explicitly **publishes** them; teachers/admins always see drafts and get a Publish toggle.
5. Differentiate **School Exam vs JAMB/NECO Mock** stats on the student Dashboard and on the Results page.
6. Redesign the **School Exam result view** with school logo, student profile + photo, and an Awwwards‑grade layout.

## Database changes (one migration)

- `public.results`: add `published_at timestamptz`, `published_by uuid`. Update the student/parent SELECT policy to require `published_at IS NOT NULL` (teachers/admins keep full read). Mark existing rows as published for backward compatibility.
- `public.mock_sessions`: add `questions_per_subject int default 20` and `fullscreen boolean default false` so the picker can persist the student's choices.
- New RPC `public.publish_results(_school uuid, _term text, _ids uuid[])` (security definer, admin/teacher only) that stamps `published_at = now()` and `published_by = auth.uid()`.

## Edge function: `mock-result-summary` (new)

Reads a submitted `mock_sessions` row + answers, computes per‑subject score, weak topics, and recommended next steps, asks Lovable AI (`google/gemini-2.5-flash`) for an encouraging 4‑section markdown summary (Overall, Strengths, Weaknesses, Next steps). Caches the result on a new `mock_sessions.ai_summary jsonb` column so it is generated once per attempt.

## Frontend

```text
src/
├─ pages/student/
│  ├─ Results.tsx            # tabs: School | NECO Mock | JAMB Mock; prominent slip CTA
│  ├─ MockPicker.tsx         # +Question count slider, +Full‑screen toggle
│  ├─ MockRunner.tsx         # honour fullscreen flag (no auto‑request), slice qs to chosen count
│  ├─ MockResult.tsx (new)   # post‑submit summary page w/ AI markdown + link to review
│  ├─ Dashboard.tsx          # split "School Avg" and "Mock Avg" stat cards
│  └─ SchoolResultCard.tsx (new) # logo + avatar + bio + table + grade ring
├─ components/results/
│  └─ ResultSlipButton.tsx   # extracted, full‑width on mobile, with loading + toast
└─ lib/slip.ts               # unchanged (already streams the PDF)
```

- Route `mock/:sessionId/result` added in App.tsx; runner navigates here after submit instead of straight to `/review`. The result page links to the existing `ExamReview` (which already does per‑question "Why?" with AI).
- `ResultSlipButton` becomes a stand‑alone card on mobile (`w-full`) and an inline button on `sm:` and above.

## Admin / Teacher

- Reuse existing teacher Gradebook list: add a "Publish" / "Unpublish" action on each row plus a bulk "Publish term" button. RLS for write stays on teacher/admin; the new RPC just keeps the audit fields.

## Out of scope (explicit)

- No changes to the existing `generate-result-slip` PDF — it already includes logo, profile, QR, signatures.
- No changes to the parent dashboard (only student gets the new layout in this pass).
- No edits to `realtime.messages` or security policies fixed in the previous turn.

## QA

- Run the mock flow: pick subjects, set questions=10, leave full‑screen off → runner stays in normal layout and shows 10 qs per subject.
- Submit a mock → land on `MockResult`, see AI summary, click "Review answers" → ExamReview opens.
- As a student, school results created with `published_at = NULL` should be hidden; teacher publishes → student sees them.
- Click **Download Result Slip** on mobile and desktop → PDF downloads with logo + profile + photo.
