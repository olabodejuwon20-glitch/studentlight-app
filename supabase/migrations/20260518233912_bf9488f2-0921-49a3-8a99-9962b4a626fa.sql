
create table public.lesson_notes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  teacher_id uuid not null,
  title text not null,
  subject text,
  grade_level text,
  topic text,
  duration_min integer,
  content text not null,
  status text not null default 'draft',
  admin_feedback text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.lesson_notes enable row level security;

create policy "Teacher manages own notes" on public.lesson_notes
  for all using (teacher_id = auth.uid() and public.is_member(school_id, auth.uid()))
  with check (teacher_id = auth.uid() and public.is_member(school_id, auth.uid()));

create policy "Admins view all notes" on public.lesson_notes
  for select using (public.is_school_admin(school_id, auth.uid()));

create policy "Admins review notes" on public.lesson_notes
  for update using (public.is_school_admin(school_id, auth.uid()))
  with check (public.is_school_admin(school_id, auth.uid()));

create policy "Members view approved notes" on public.lesson_notes
  for select using (status = 'approved' and public.is_member(school_id, auth.uid()));

create trigger lesson_notes_set_updated_at before update on public.lesson_notes
  for each row execute function public.set_updated_at();

create index lesson_notes_school_status_idx on public.lesson_notes (school_id, status, created_at desc);
create index lesson_notes_teacher_idx on public.lesson_notes (teacher_id, created_at desc);
