
-- 1. exam_violations
create table public.exam_violations (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null,
  school_id uuid not null,
  type text not null,
  detail text,
  created_at timestamptz not null default now()
);
create index idx_exam_violations_attempt on public.exam_violations(attempt_id);
alter table public.exam_violations enable row level security;

create policy "Owner inserts own violations"
  on public.exam_violations for insert
  with check (exists (select 1 from public.exam_attempts a
    where a.id = attempt_id and a.student_id = auth.uid() and a.school_id = exam_violations.school_id));

create policy "Owner/teacher/admin view violations"
  on public.exam_violations for select
  using (exists (select 1 from public.exam_attempts a
    where a.id = attempt_id and (
      a.student_id = auth.uid()
      or public.has_school_role(a.school_id, auth.uid(), 'teacher')
      or public.is_school_admin(a.school_id, auth.uid())
    )));

-- 2. question_bank
create table public.question_bank (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  subject text not null,
  topic text,
  difficulty text not null default 'medium',
  type text not null default 'mcq',
  body text not null,
  options jsonb not null default '[]'::jsonb,
  answer jsonb,
  explanation text,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_qbank_school on public.question_bank(school_id);
create index idx_qbank_subject on public.question_bank(school_id, subject);
alter table public.question_bank enable row level security;

create policy "Members view question bank"
  on public.question_bank for select
  using (public.is_member(school_id, auth.uid()));

create policy "Teachers/Admins manage question bank"
  on public.question_bank for all
  using (public.has_school_role(school_id, auth.uid(), 'teacher') or public.is_school_admin(school_id, auth.uid()))
  with check (public.has_school_role(school_id, auth.uid(), 'teacher') or public.is_school_admin(school_id, auth.uid()));

create trigger trg_qbank_updated before update on public.question_bank
for each row execute function public.set_updated_at();

-- 3. question_tags
create table public.question_tags (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.question_bank(id) on delete cascade,
  tag text not null,
  unique(question_id, tag)
);
alter table public.question_tags enable row level security;

create policy "Members view question tags"
  on public.question_tags for select
  using (exists (select 1 from public.question_bank q
    where q.id = question_id and public.is_member(q.school_id, auth.uid())));

create policy "Teachers/Admins manage question tags"
  on public.question_tags for all
  using (exists (select 1 from public.question_bank q
    where q.id = question_id and (
      public.has_school_role(q.school_id, auth.uid(), 'teacher')
      or public.is_school_admin(q.school_id, auth.uid())
    )))
  with check (exists (select 1 from public.question_bank q
    where q.id = question_id and (
      public.has_school_role(q.school_id, auth.uid(), 'teacher')
      or public.is_school_admin(q.school_id, auth.uid())
    )));

-- 4. exams additions
alter table public.exams
  add column if not exists duration_min integer,
  add column if not exists randomize boolean not null default false,
  add column if not exists proctored boolean not null default false,
  add column if not exists violation_limit integer not null default 3;

-- 5. schools additions
alter table public.schools
  add column if not exists neco_subject_codes jsonb not null default '{}'::jsonb,
  add column if not exists proctoring_default boolean not null default false,
  add column if not exists exams_violation_limit integer not null default 3;

-- 6. exam_answers: add updated_at + unique constraint
alter table public.exam_answers
  add column if not exists updated_at timestamptz not null default now();

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'exam_answers_attempt_question_key'
  ) then
    alter table public.exam_answers
      add constraint exam_answers_attempt_question_key unique (attempt_id, question_id);
  end if;
end $$;

create trigger trg_exam_answers_updated before update on public.exam_answers
for each row execute function public.set_updated_at();

-- 7. proctor-snapshots private bucket
insert into storage.buckets (id, name, public) values ('proctor-snapshots', 'proctor-snapshots', false)
on conflict (id) do nothing;

create policy "Student uploads own proctor snapshots"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'proctor-snapshots'
    and exists (
      select 1 from public.exam_attempts a
      where a.id::text = (storage.foldername(name))[2]
        and a.student_id = auth.uid()
    )
  );

create policy "Owner/teacher/admin read proctor snapshots"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'proctor-snapshots'
    and exists (
      select 1 from public.exam_attempts a
      where a.id::text = (storage.foldername(name))[2]
        and (
          a.student_id = auth.uid()
          or public.has_school_role(a.school_id, auth.uid(), 'teacher')
          or public.is_school_admin(a.school_id, auth.uid())
        )
    )
  );
