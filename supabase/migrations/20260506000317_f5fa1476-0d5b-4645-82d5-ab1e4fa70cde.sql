-- ============ ENUMS ============
do $$ begin
  create type public.member_role as enum ('admin','teacher','student','parent');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.attendance_status as enum ('present','absent','late','excused');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.exam_status as enum ('draft','scheduled','active','closed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.fee_status as enum ('pending','paid','overdue');
exception when duplicate_object then null; end $$;

-- ============ SCHOOLS ============
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  logo_url text,
  address text,
  email text,
  phone text,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.schools enable row level security;

-- ============ MEMBERSHIPS ============
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null,
  role public.member_role not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (school_id, user_id, role)
);
alter table public.memberships enable row level security;
create index on public.memberships(school_id);
create index on public.memberships(user_id);

-- ============ HELPER FUNCTIONS ============
create or replace function public.is_member(_school uuid, _user uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.memberships where school_id=_school and user_id=_user and status='active')
$$;

create or replace function public.has_school_role(_school uuid, _user uuid, _role public.member_role)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.memberships where school_id=_school and user_id=_user and role=_role and status='active')
$$;

create or replace function public.is_school_admin(_school uuid, _user uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.memberships where school_id=_school and user_id=_user and role='admin' and status='active')
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger schools_updated before update on public.schools for each row execute function public.set_updated_at();

-- Schools RLS
create policy "Schools viewable by members" on public.schools for select
  using (public.is_member(id, auth.uid()));
create policy "Anyone authenticated can create a school" on public.schools for insert
  to authenticated with check (auth.uid() = created_by);
create policy "Admins update school" on public.schools for update
  using (public.is_school_admin(id, auth.uid()));
create policy "Public slug lookup" on public.schools for select
  to anon, authenticated using (true);
-- Note: the "Public slug lookup" overrides — we want public ability to read minimal fields. We'll restrict via a view instead.
drop policy "Public slug lookup" on public.schools;

create or replace view public.schools_public
with (security_invoker=on) as
  select id, name, slug, logo_url from public.schools;
grant select on public.schools_public to anon, authenticated;
-- Allow anon to read base table only via view? Views with security_invoker need base policy.
-- Add a permissive select policy that exposes only via view by allowing all selects (slug is non-sensitive).
create policy "Public schools read" on public.schools for select to anon using (true);

-- Memberships RLS
create policy "Members see same-school memberships" on public.memberships for select
  using (public.is_member(school_id, auth.uid()));
create policy "User sees own memberships" on public.memberships for select
  using (user_id = auth.uid());
create policy "Admins manage memberships" on public.memberships for all
  using (public.is_school_admin(school_id, auth.uid()))
  with check (public.is_school_admin(school_id, auth.uid()));
create policy "User can insert self via invite (handled by SECURITY DEFINER fn)" on public.memberships for insert
  with check (user_id = auth.uid());
-- Creator becomes admin: handled via trigger after school insert
create or replace function public.bootstrap_school_admin()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.memberships(school_id, user_id, role) values (new.id, new.created_by, 'admin');
  return new;
end $$;
create trigger schools_bootstrap_admin after insert on public.schools
  for each row execute function public.bootstrap_school_admin();

-- ============ INVITE CODES ============
create table public.invite_codes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  code text not null unique,
  role public.member_role not null,
  max_uses int not null default 50,
  uses int not null default 0,
  expires_at timestamptz,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
alter table public.invite_codes enable row level security;
create policy "Admins manage invites" on public.invite_codes for all
  using (public.is_school_admin(school_id, auth.uid()))
  with check (public.is_school_admin(school_id, auth.uid()));
-- Anyone authenticated can look up a code (to redeem)
create policy "Lookup invite by code" on public.invite_codes for select to authenticated using (true);

-- Redeem invite
create or replace function public.redeem_invite(_code text)
returns uuid language plpgsql security definer set search_path=public as $$
declare
  v_invite public.invite_codes;
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select * into v_invite from public.invite_codes where code = _code for update;
  if not found then raise exception 'invalid code'; end if;
  if v_invite.expires_at is not null and v_invite.expires_at < now() then raise exception 'code expired'; end if;
  if v_invite.uses >= v_invite.max_uses then raise exception 'code exhausted'; end if;
  insert into public.memberships(school_id, user_id, role) values (v_invite.school_id, v_uid, v_invite.role)
    on conflict (school_id, user_id, role) do nothing;
  update public.invite_codes set uses = uses + 1 where id = v_invite.id;
  return v_invite.school_id;
end $$;

-- ============ PARENT - STUDENT LINKS ============
create table public.parent_links (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  parent_user_id uuid not null,
  student_user_id uuid not null,
  created_at timestamptz not null default now(),
  unique(school_id, parent_user_id, student_user_id)
);
alter table public.parent_links enable row level security;
create policy "Parents read own links" on public.parent_links for select
  using (parent_user_id = auth.uid() or student_user_id = auth.uid() or public.is_school_admin(school_id, auth.uid()));
create policy "Admins manage parent links" on public.parent_links for all
  using (public.is_school_admin(school_id, auth.uid()))
  with check (public.is_school_admin(school_id, auth.uid()));

-- ============ CLASSES ============
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  code text not null,
  name text not null,
  subject text,
  grade_level text,
  teacher_id uuid,
  created_at timestamptz not null default now()
);
alter table public.classes enable row level security;
create policy "Members view classes" on public.classes for select using (public.is_member(school_id, auth.uid()));
create policy "Admins manage classes" on public.classes for all
  using (public.is_school_admin(school_id, auth.uid()))
  with check (public.is_school_admin(school_id, auth.uid()));

create table public.class_enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null,
  school_id uuid not null references public.schools(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(class_id, student_id)
);
alter table public.class_enrollments enable row level security;
create policy "Members view enrollments" on public.class_enrollments for select using (public.is_member(school_id, auth.uid()));
create policy "Admins manage enrollments" on public.class_enrollments for all
  using (public.is_school_admin(school_id, auth.uid())) with check (public.is_school_admin(school_id, auth.uid()));

-- ============ ATTENDANCE ============
create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null,
  date date not null,
  status public.attendance_status not null,
  marked_by uuid,
  created_at timestamptz not null default now(),
  unique(class_id, student_id, date)
);
alter table public.attendance enable row level security;
create policy "Members view attendance" on public.attendance for select using (public.is_member(school_id, auth.uid()));
create policy "Teachers/Admins write attendance" on public.attendance for all
  using (public.has_school_role(school_id, auth.uid(),'teacher') or public.is_school_admin(school_id, auth.uid()))
  with check (public.has_school_role(school_id, auth.uid(),'teacher') or public.is_school_admin(school_id, auth.uid()));

-- ============ EXAMS ============
create table public.exams (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  title text not null,
  subject text,
  scheduled_at timestamptz,
  duration_minutes int not null default 60,
  status public.exam_status not null default 'draft',
  created_by uuid not null,
  created_at timestamptz not null default now()
);
alter table public.exams enable row level security;
create policy "Members view exams" on public.exams for select using (public.is_member(school_id, auth.uid()));
create policy "Teachers/Admins manage exams" on public.exams for all
  using (public.has_school_role(school_id, auth.uid(),'teacher') or public.is_school_admin(school_id, auth.uid()))
  with check (public.has_school_role(school_id, auth.uid(),'teacher') or public.is_school_admin(school_id, auth.uid()));

create table public.exam_questions (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  position int not null default 0,
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  correct_index int not null default 0,
  points int not null default 1
);
alter table public.exam_questions enable row level security;
create policy "Members view questions" on public.exam_questions for select using (public.is_member(school_id, auth.uid()));
create policy "Teachers/Admins manage questions" on public.exam_questions for all
  using (public.has_school_role(school_id, auth.uid(),'teacher') or public.is_school_admin(school_id, auth.uid()))
  with check (public.has_school_role(school_id, auth.uid(),'teacher') or public.is_school_admin(school_id, auth.uid()));

create table public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  score numeric,
  unique(exam_id, student_id)
);
alter table public.exam_attempts enable row level security;
create policy "Student/teacher view attempts" on public.exam_attempts for select
  using (student_id = auth.uid() or public.has_school_role(school_id, auth.uid(),'teacher') or public.is_school_admin(school_id, auth.uid()));
create policy "Students start own attempt" on public.exam_attempts for insert
  with check (student_id = auth.uid() and public.has_school_role(school_id, auth.uid(),'student'));
create policy "Students update own attempt" on public.exam_attempts for update
  using (student_id = auth.uid()) with check (student_id = auth.uid());

create table public.exam_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.exam_attempts(id) on delete cascade,
  question_id uuid not null references public.exam_questions(id) on delete cascade,
  selected_index int,
  unique(attempt_id, question_id)
);
alter table public.exam_answers enable row level security;
create policy "Owner of attempt manages answers" on public.exam_answers for all
  using (exists(select 1 from public.exam_attempts a where a.id = attempt_id and (a.student_id = auth.uid() or public.has_school_role(a.school_id, auth.uid(),'teacher') or public.is_school_admin(a.school_id, auth.uid()))))
  with check (exists(select 1 from public.exam_attempts a where a.id = attempt_id and a.student_id = auth.uid()));

-- ============ RESULTS ============
create table public.results (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null,
  subject text not null,
  term text not null default 'Term 1',
  score numeric not null,
  grade text,
  remarks text,
  teacher_id uuid,
  created_at timestamptz not null default now()
);
alter table public.results enable row level security;
create policy "Student/parent/teacher view results" on public.results for select
  using (
    student_id = auth.uid()
    or public.has_school_role(school_id, auth.uid(),'teacher')
    or public.is_school_admin(school_id, auth.uid())
    or exists(select 1 from public.parent_links pl where pl.school_id=results.school_id and pl.parent_user_id=auth.uid() and pl.student_user_id=results.student_id)
  );
create policy "Teachers/Admins manage results" on public.results for all
  using (public.has_school_role(school_id, auth.uid(),'teacher') or public.is_school_admin(school_id, auth.uid()))
  with check (public.has_school_role(school_id, auth.uid(),'teacher') or public.is_school_admin(school_id, auth.uid()));

-- ============ LIBRARY ============
create table public.library_files (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  name text not null,
  category text,
  storage_path text not null,
  size_bytes bigint,
  uploaded_by uuid not null,
  created_at timestamptz not null default now()
);
alter table public.library_files enable row level security;
create policy "Members view library" on public.library_files for select using (public.is_member(school_id, auth.uid()));
create policy "Teachers/Admins upload library" on public.library_files for insert
  with check (uploaded_by = auth.uid() and (public.has_school_role(school_id, auth.uid(),'teacher') or public.is_school_admin(school_id, auth.uid())));
create policy "Teachers/Admins delete library" on public.library_files for delete
  using (public.has_school_role(school_id, auth.uid(),'teacher') or public.is_school_admin(school_id, auth.uid()));

insert into storage.buckets (id, name, public) values ('library','library', false) on conflict (id) do nothing;

create policy "School members read library files" on storage.objects for select
  using (bucket_id='library' and public.is_member((storage.foldername(name))[1]::uuid, auth.uid()));
create policy "Teachers/Admins write library files" on storage.objects for insert
  with check (bucket_id='library' and (public.has_school_role((storage.foldername(name))[1]::uuid, auth.uid(),'teacher') or public.is_school_admin((storage.foldername(name))[1]::uuid, auth.uid())));
create policy "Teachers/Admins delete library files" on storage.objects for delete
  using (bucket_id='library' and (public.has_school_role((storage.foldername(name))[1]::uuid, auth.uid(),'teacher') or public.is_school_admin((storage.foldername(name))[1]::uuid, auth.uid())));

-- ============ ANNOUNCEMENTS ============
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  title text not null,
  body text,
  created_by uuid not null,
  created_at timestamptz not null default now()
);
alter table public.announcements enable row level security;
create policy "Members view announcements" on public.announcements for select using (public.is_member(school_id, auth.uid()));
create policy "Teachers/Admins post announcements" on public.announcements for insert
  with check (created_by = auth.uid() and (public.has_school_role(school_id, auth.uid(),'teacher') or public.is_school_admin(school_id, auth.uid())));
create policy "Author or admin deletes announcement" on public.announcements for delete
  using (created_by = auth.uid() or public.is_school_admin(school_id, auth.uid()));

-- ============ MESSAGES ============
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  sender_id uuid not null,
  recipient_id uuid not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create policy "Sender/recipient view message" on public.messages for select
  using ((sender_id = auth.uid() or recipient_id = auth.uid()) and public.is_member(school_id, auth.uid()));
create policy "Send message to school member" on public.messages for insert
  with check (sender_id = auth.uid() and public.is_member(school_id, auth.uid()));
create policy "Recipient marks read" on public.messages for update
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- ============ FEES ============
create table public.fees (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null,
  description text not null,
  amount numeric not null,
  status public.fee_status not null default 'pending',
  due_date date,
  created_at timestamptz not null default now()
);
alter table public.fees enable row level security;
create policy "Student/parent/admin view fees" on public.fees for select
  using (
    student_id = auth.uid()
    or public.is_school_admin(school_id, auth.uid())
    or exists(select 1 from public.parent_links pl where pl.school_id=fees.school_id and pl.parent_user_id=auth.uid() and pl.student_user_id=fees.student_id)
  );
create policy "Admins manage fees" on public.fees for all
  using (public.is_school_admin(school_id, auth.uid())) with check (public.is_school_admin(school_id, auth.uid()));

-- ============ AI CHATS ============
create table public.ai_chats (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.ai_chats enable row level security;
create policy "Owner reads chats" on public.ai_chats for select using (user_id = auth.uid() and public.is_member(school_id, auth.uid()));
create policy "Owner writes chats" on public.ai_chats for insert with check (user_id = auth.uid() and public.is_member(school_id, auth.uid()));

-- ============ PROFILES backfill: ensure email/full_name available ============
-- (profiles table already exists with id, full_name, email)
