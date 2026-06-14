
-- ============================================================
-- Traditional Exam System — Phase 1
-- ============================================================

-- ---------- ENUMS ----------
create type public.trad_session_status as enum ('planning','published','locked');
create type public.trad_timetable_status as enum ('draft','pending','approved');
create type public.trad_exam_type as enum ('mcq','theory','mixed');
create type public.trad_draft_status as enum ('draft','submitted','approved','locked');
create type public.trad_question_type as enum ('mcq','theory');
create type public.trad_upload_status as enum ('pending','parsing','parsed','failed');

-- ---------- 1. trad_exam_sessions ----------
create table public.trad_exam_sessions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  term text,
  academic_year text,
  start_date date,
  end_date date,
  status public.trad_session_status not null default 'planning',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trad_exam_sessions_school_idx on public.trad_exam_sessions(school_id);

grant select, insert, update, delete on public.trad_exam_sessions to authenticated;
grant all on public.trad_exam_sessions to service_role;

alter table public.trad_exam_sessions enable row level security;

create policy "trad_sessions_school_read" on public.trad_exam_sessions
  for select to authenticated
  using (public.is_member(school_id, auth.uid()));

create policy "trad_sessions_admin_write" on public.trad_exam_sessions
  for all to authenticated
  using (public.is_school_admin(school_id, auth.uid()))
  with check (public.is_school_admin(school_id, auth.uid()));

create trigger trad_exam_sessions_updated_at
  before update on public.trad_exam_sessions
  for each row execute function public.set_updated_at();


-- ---------- 2. trad_exam_timetable ----------
create table public.trad_exam_timetable (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  session_id uuid not null references public.trad_exam_sessions(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  subject_name text,
  exam_date date not null,
  start_time time not null,
  duration_minutes int not null default 60 check (duration_minutes between 5 and 600),
  venue text,
  status public.trad_timetable_status not null default 'draft',
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trad_exam_timetable_session_idx on public.trad_exam_timetable(session_id);
create index trad_exam_timetable_class_date_idx on public.trad_exam_timetable(class_id, exam_date);

grant select, insert, update, delete on public.trad_exam_timetable to authenticated;
grant all on public.trad_exam_timetable to service_role;

alter table public.trad_exam_timetable enable row level security;

create policy "trad_timetable_school_read" on public.trad_exam_timetable
  for select to authenticated
  using (public.is_member(school_id, auth.uid()));

create policy "trad_timetable_admin_write" on public.trad_exam_timetable
  for all to authenticated
  using (public.is_school_admin(school_id, auth.uid()))
  with check (public.is_school_admin(school_id, auth.uid()));

create trigger trad_exam_timetable_updated_at
  before update on public.trad_exam_timetable
  for each row execute function public.set_updated_at();

-- Conflict detection trigger: no overlapping slots for same class on same date
create or replace function public.trad_check_timetable_conflict()
returns trigger
language plpgsql
set search_path to 'public'
as $$
declare v_conflict int;
begin
  select count(*) into v_conflict
  from public.trad_exam_timetable t
  where t.class_id = new.class_id
    and t.exam_date = new.exam_date
    and t.id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid)
    and (
      (new.start_time, new.start_time + make_interval(mins => new.duration_minutes))
      overlaps
      (t.start_time, t.start_time + make_interval(mins => t.duration_minutes))
    );
  if v_conflict > 0 then
    raise exception 'Schedule conflict: class already has an exam at this time';
  end if;
  return new;
end $$;

create trigger trad_timetable_conflict_check
  before insert or update on public.trad_exam_timetable
  for each row execute function public.trad_check_timetable_conflict();


-- ---------- 3. trad_exams ----------
create table public.trad_exams (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  timetable_id uuid unique references public.trad_exam_timetable(id) on delete cascade,
  title text not null,
  instructions text,
  total_marks int not null default 100,
  exam_type public.trad_exam_type not null default 'mixed',
  draft_status public.trad_draft_status not null default 'draft',
  author_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trad_exams_school_idx on public.trad_exams(school_id);
create index trad_exams_author_idx on public.trad_exams(author_id);

grant select, insert, update, delete on public.trad_exams to authenticated;
grant all on public.trad_exams to service_role;

alter table public.trad_exams enable row level security;

create policy "trad_exams_school_staff_read" on public.trad_exams
  for select to authenticated
  using (
    public.is_school_admin(school_id, auth.uid())
    or public.has_school_role(school_id, auth.uid(), 'teacher'::member_role)
  );

create policy "trad_exams_admin_all" on public.trad_exams
  for all to authenticated
  using (public.is_school_admin(school_id, auth.uid()))
  with check (public.is_school_admin(school_id, auth.uid()));

create policy "trad_exams_teacher_own_insert" on public.trad_exams
  for insert to authenticated
  with check (
    public.has_school_role(school_id, auth.uid(), 'teacher'::member_role)
    and author_id = auth.uid()
  );

create policy "trad_exams_teacher_own_update" on public.trad_exams
  for update to authenticated
  using (
    public.has_school_role(school_id, auth.uid(), 'teacher'::member_role)
    and author_id = auth.uid()
    and draft_status in ('draft','submitted')
  )
  with check (
    public.has_school_role(school_id, auth.uid(), 'teacher'::member_role)
    and author_id = auth.uid()
  );

create policy "trad_exams_teacher_own_delete" on public.trad_exams
  for delete to authenticated
  using (
    public.has_school_role(school_id, auth.uid(), 'teacher'::member_role)
    and author_id = auth.uid()
    and draft_status = 'draft'
  );

create trigger trad_exams_updated_at
  before update on public.trad_exams
  for each row execute function public.set_updated_at();


-- ---------- 4. trad_exam_sections ----------
create table public.trad_exam_sections (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  exam_id uuid not null references public.trad_exams(id) on delete cascade,
  label text not null,
  instructions text,
  position int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trad_exam_sections_exam_idx on public.trad_exam_sections(exam_id);

grant select, insert, update, delete on public.trad_exam_sections to authenticated;
grant all on public.trad_exam_sections to service_role;

alter table public.trad_exam_sections enable row level security;

create policy "trad_sections_school_staff_read" on public.trad_exam_sections
  for select to authenticated
  using (
    public.is_school_admin(school_id, auth.uid())
    or public.has_school_role(school_id, auth.uid(), 'teacher'::member_role)
  );

create policy "trad_sections_admin_all" on public.trad_exam_sections
  for all to authenticated
  using (public.is_school_admin(school_id, auth.uid()))
  with check (public.is_school_admin(school_id, auth.uid()));

create policy "trad_sections_teacher_own" on public.trad_exam_sections
  for all to authenticated
  using (
    exists (select 1 from public.trad_exams e
            where e.id = exam_id and e.author_id = auth.uid()
              and e.draft_status in ('draft','submitted'))
  )
  with check (
    exists (select 1 from public.trad_exams e
            where e.id = exam_id and e.author_id = auth.uid())
  );

create trigger trad_exam_sections_updated_at
  before update on public.trad_exam_sections
  for each row execute function public.set_updated_at();


-- ---------- 5. trad_exam_questions ----------
create table public.trad_exam_questions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  exam_id uuid not null references public.trad_exams(id) on delete cascade,
  section_id uuid references public.trad_exam_sections(id) on delete set null,
  position int not null default 0,
  type public.trad_question_type not null,
  prompt text not null,
  options jsonb,           -- mcq only: array of strings
  correct_index int,       -- mcq only (kept server-side; never sent to students)
  model_answer text,       -- theory only (private)
  marks int not null default 1,
  image_path text,         -- storage path inside trad-exam-assets bucket
  explanation text,
  ai_generated boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trad_exam_questions_exam_idx on public.trad_exam_questions(exam_id);

grant select, insert, update, delete on public.trad_exam_questions to authenticated;
grant all on public.trad_exam_questions to service_role;

alter table public.trad_exam_questions enable row level security;

create policy "trad_questions_school_staff_read" on public.trad_exam_questions
  for select to authenticated
  using (
    public.is_school_admin(school_id, auth.uid())
    or public.has_school_role(school_id, auth.uid(), 'teacher'::member_role)
  );

create policy "trad_questions_admin_all" on public.trad_exam_questions
  for all to authenticated
  using (public.is_school_admin(school_id, auth.uid()))
  with check (public.is_school_admin(school_id, auth.uid()));

create policy "trad_questions_teacher_own" on public.trad_exam_questions
  for all to authenticated
  using (
    exists (select 1 from public.trad_exams e
            where e.id = exam_id and e.author_id = auth.uid()
              and e.draft_status in ('draft','submitted'))
  )
  with check (
    exists (select 1 from public.trad_exams e
            where e.id = exam_id and e.author_id = auth.uid())
  );

create trigger trad_exam_questions_updated_at
  before update on public.trad_exam_questions
  for each row execute function public.set_updated_at();


-- ---------- 6. trad_exam_uploads ----------
create table public.trad_exam_uploads (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  exam_id uuid not null references public.trad_exams(id) on delete cascade,
  file_path text not null,
  file_name text,
  mime text,
  status public.trad_upload_status not null default 'pending',
  parse_meta jsonb not null default '{}'::jsonb,
  error text,
  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trad_exam_uploads_exam_idx on public.trad_exam_uploads(exam_id);

grant select, insert, update, delete on public.trad_exam_uploads to authenticated;
grant all on public.trad_exam_uploads to service_role;

alter table public.trad_exam_uploads enable row level security;

create policy "trad_uploads_school_staff_read" on public.trad_exam_uploads
  for select to authenticated
  using (
    public.is_school_admin(school_id, auth.uid())
    or public.has_school_role(school_id, auth.uid(), 'teacher'::member_role)
  );

create policy "trad_uploads_admin_all" on public.trad_exam_uploads
  for all to authenticated
  using (public.is_school_admin(school_id, auth.uid()))
  with check (public.is_school_admin(school_id, auth.uid()));

create policy "trad_uploads_teacher_own" on public.trad_exam_uploads
  for all to authenticated
  using (
    exists (select 1 from public.trad_exams e
            where e.id = exam_id and e.author_id = auth.uid())
  )
  with check (
    exists (select 1 from public.trad_exams e
            where e.id = exam_id and e.author_id = auth.uid())
  );

create trigger trad_exam_uploads_updated_at
  before update on public.trad_exam_uploads
  for each row execute function public.set_updated_at();
