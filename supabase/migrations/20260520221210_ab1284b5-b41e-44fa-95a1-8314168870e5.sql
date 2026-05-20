
-- Assignments
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  class_id uuid,
  teacher_id uuid not null,
  title text not null,
  description text,
  subject text,
  due_at timestamptz,
  max_score numeric not null default 100,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.assignments enable row level security;
create policy "Members view assignments" on public.assignments for select using (is_member(school_id, auth.uid()));
create policy "Teachers/Admins manage assignments" on public.assignments for all
  using (has_school_role(school_id, auth.uid(), 'teacher') or is_school_admin(school_id, auth.uid()))
  with check (((teacher_id = auth.uid()) or is_school_admin(school_id, auth.uid())) and (has_school_role(school_id, auth.uid(), 'teacher') or is_school_admin(school_id, auth.uid())));
create trigger trg_assignments_updated before update on public.assignments for each row execute function public.set_updated_at();

-- Assignment submissions
create table public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null,
  school_id uuid not null,
  student_id uuid not null,
  content text,
  attachments jsonb not null default '[]'::jsonb,
  submitted_at timestamptz not null default now(),
  score numeric,
  feedback text,
  graded_by uuid,
  graded_at timestamptz,
  unique (assignment_id, student_id)
);
alter table public.assignment_submissions enable row level security;
create policy "Student manages own submission" on public.assignment_submissions for all
  using (student_id = auth.uid() and is_member(school_id, auth.uid()))
  with check (student_id = auth.uid() and is_member(school_id, auth.uid()));
create policy "Teacher/Admin view submissions" on public.assignment_submissions for select
  using (has_school_role(school_id, auth.uid(), 'teacher') or is_school_admin(school_id, auth.uid())
    or exists (select 1 from public.parent_links pl where pl.school_id = assignment_submissions.school_id and pl.parent_user_id = auth.uid() and pl.student_user_id = assignment_submissions.student_id));
create policy "Teacher/Admin grade submissions" on public.assignment_submissions for update
  using (has_school_role(school_id, auth.uid(), 'teacher') or is_school_admin(school_id, auth.uid()))
  with check (has_school_role(school_id, auth.uid(), 'teacher') or is_school_admin(school_id, auth.uid()));

-- Gradebook entries (continuous assessment)
create table public.gradebook_entries (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  class_id uuid not null,
  student_id uuid not null,
  teacher_id uuid not null,
  subject text not null,
  term text not null default 'Term 1',
  category text not null default 'CA',
  title text not null,
  score numeric not null default 0,
  max_score numeric not null default 10,
  recorded_at date not null default current_date,
  created_at timestamptz not null default now()
);
alter table public.gradebook_entries enable row level security;
create policy "View gradebook" on public.gradebook_entries for select using (
  student_id = auth.uid()
  or has_school_role(school_id, auth.uid(), 'teacher')
  or is_school_admin(school_id, auth.uid())
  or exists (select 1 from public.parent_links pl where pl.school_id = gradebook_entries.school_id and pl.parent_user_id = auth.uid() and pl.student_user_id = gradebook_entries.student_id)
);
create policy "Teachers/Admins manage gradebook" on public.gradebook_entries for all
  using (has_school_role(school_id, auth.uid(), 'teacher') or is_school_admin(school_id, auth.uid()))
  with check (has_school_role(school_id, auth.uid(), 'teacher') or is_school_admin(school_id, auth.uid()));

-- Behavior notes
create table public.behavior_notes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  student_id uuid not null,
  teacher_id uuid not null,
  type text not null default 'note', -- 'commendation' | 'incident' | 'note'
  category text,
  note text not null,
  severity text not null default 'low', -- low | medium | high
  visible_to_parent boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.behavior_notes enable row level security;
create policy "View behavior notes" on public.behavior_notes for select using (
  student_id = auth.uid()
  or has_school_role(school_id, auth.uid(), 'teacher')
  or is_school_admin(school_id, auth.uid())
  or (visible_to_parent and exists (select 1 from public.parent_links pl where pl.school_id = behavior_notes.school_id and pl.parent_user_id = auth.uid() and pl.student_user_id = behavior_notes.student_id))
);
create policy "Teachers/Admins manage behavior" on public.behavior_notes for all
  using (has_school_role(school_id, auth.uid(), 'teacher') or is_school_admin(school_id, auth.uid()))
  with check (has_school_role(school_id, auth.uid(), 'teacher') or is_school_admin(school_id, auth.uid()));

-- Parent communications (linked to a student)
create table public.parent_comms (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  student_id uuid not null,
  teacher_id uuid not null,
  parent_id uuid not null,
  subject text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.parent_comms enable row level security;
create policy "Parties view parent comms" on public.parent_comms for select using (
  teacher_id = auth.uid() or parent_id = auth.uid() or is_school_admin(school_id, auth.uid())
);
create policy "Teacher writes parent comm" on public.parent_comms for insert with check (
  teacher_id = auth.uid() and (has_school_role(school_id, auth.uid(), 'teacher') or is_school_admin(school_id, auth.uid()))
);
create policy "Parent marks read" on public.parent_comms for update using (parent_id = auth.uid()) with check (parent_id = auth.uid());

create index idx_assignments_class on public.assignments(class_id);
create index idx_submissions_assignment on public.assignment_submissions(assignment_id);
create index idx_gradebook_student on public.gradebook_entries(student_id);
create index idx_behavior_student on public.behavior_notes(student_id);
create index idx_parent_comms_parent on public.parent_comms(parent_id);
