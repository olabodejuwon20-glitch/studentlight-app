# Remix of Legacyskool

Build a premium multi-role SaaS school management system frontend.

STYLE:

- Clean, modern SaaS UI (Stripe/Notion style)

- High contrast text for readability

- Soft shadows, rounded cards (12px)

- Proper spacing and alignment

- Light and dark mode

LAYOUT:

- Sidebar navigation (collapsible)

- Top navbar (search, notifications, profile)

- Responsive dashboard layout

ROLES:

Admin, Teacher, Student, Parent

GLOBAL LOGIC:

- One app with role-based UI switching

- No backend logic

- Use mock data

- Prepare for API integration later

ADMIN SCREENS:

- Dashboard (stats, charts, recent activity)

- Students (table with add/edit modal)

- Teachers (table)

- Reports (charts)

- Settings

TEACHER SCREENS:

- Dashboard (classes, grading, attendance)

- Classes (card grid)

- Attendance (table with toggles)

- Test builder (form UI)

- Grading (table)

STUDENT SCREENS:

- Dashboard (exams, performance, announcements)

- Exam interface (CBT with timer and question navigation)

- Results (cards with grades)

- Library (file list)

- AI Tutor (chat UI)

PARENT SCREENS:

- Dashboard (child overview)

- Results (table/cards)

- Attendance (table/calendar)

- Activity feed

UX:

- Loading skeletons

- Empty states

- Toast notifications

- Smooth hover effects

IMPORTANT:

- Focus on clean UI and readability

- Do not clutter design

build exactly as in the image without missing any thing

This project is built and maintained with Antigravity.

## Development

You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Environment Variables

Create a `.env` file with:

```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<your-supabase-anon-key>
VITE_SITE_URL=https://legacyskool.com
```

For Supabase edge functions, set these secrets:

```
AI_API_KEY=<your-gemini-api-key>
AI_GATEWAY_URL=https://generativelanguage.googleapis.com/v1beta/openai/chat/completions
```
