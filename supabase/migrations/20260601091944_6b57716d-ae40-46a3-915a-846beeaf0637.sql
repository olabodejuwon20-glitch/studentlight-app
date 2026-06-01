
-- =========================================================
-- Phase 0: Unified Assessment Engine (additive)
-- =========================================================

-- ---------- ENUMS ----------
do $$ begin
  create type public.assessment_type as enum
    ('school_test','school_exam','jamb_mock','neco_mock','waec_mock','ai_assessment');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.assessment_delivery as enum ('proctored','open','practice');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.assessment_status_v2 as enum
    ('draft','in_review','scheduled','published','archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.assessment_source as enum
    ('manual','question_bank','ai_generated','mixed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.question_type as enum
    ('mcq','multi','short','essay','numeric');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.question_difficulty as enum ('easy','medium','hard');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.exam_body as enum ('jamb','waec','neco','school','generic');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.attempt_status as enum
    ('in_progress','submitted','expired','voided');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.bank_scope as enum ('school','global');
exception when duplicate_object then null; end $$;

-- ---------- assessments ----------
create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  created_by uuid not null,
  class_id uuid,
  title text not null,
  description text,
  type public.assessment_type not null,
  delivery_mode public.assessment_delivery not null default 'open',
  status public.assessment_status_v2 not null default 'draft',
  source public.assessment_source not null default 'manual',
  config jsonb not null default '{}'::jsonb,
  scheduled_at timestamptz,
  opens_at timestamptz,
  closes_at timestamptz,
  counts_to_results boolean not null default true,
  weight numeric not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.assessments (school_id, status);
create index on public.assessments (school_id, type);
create index on public.assessments (class_id);

grant select, insert, update, delete on public.assessments to authenticated;
grant all on public.assessments to service_role;
alter table public.assessments enable row level security;

create policy "members view published assessments"
  on public.assessments for select
  using (status in ('scheduled','published') and is_member(school_id, auth.uid()));

create policy "staff view all assessments"
  on public.assessments for select
  using (has_school_role(school_id, auth.uid(), 'teacher'::member_role)
         or is_school_admin(school_id, auth.uid()));

create policy "staff manage assessments"
  on public.assessments for all
  using (has_school_role(school_id, auth.uid(), 'teacher'::member_role)
         or is_school_admin(school_id, auth.uid()))
  with check (has_school_role(school_id, auth.uid(), 'teacher'::member_role)
              or is_school_admin(school_id, auth.uid()));

create trigger trg_assessments_touch
  before update on public.assessments
  for each row execute function public.set_updated_at();

-- ---------- assessment_sections ----------
create table public.assessment_sections (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  school_id uuid not null,
  subject_code text,
  title text not null,
  position integer not null default 0,
  question_count integer not null default 0,
  time_limit_min integer,
  source_filter jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index on public.assessment_sections (assessment_id, position);

grant select, insert, update, delete on public.assessment_sections to authenticated;
grant all on public.assessment_sections to service_role;
alter table public.assessment_sections enable row level security;

create policy "members view sections of visible assessments"
  on public.assessment_sections for select
  using (exists (select 1 from public.assessments a
                 where a.id = assessment_id
                   and (
                     (a.status in ('scheduled','published') and is_member(a.school_id, auth.uid()))
                     or has_school_role(a.school_id, auth.uid(), 'teacher'::member_role)
                     or is_school_admin(a.school_id, auth.uid())
                   )));

create policy "staff manage sections"
  on public.assessment_sections for all
  using (has_school_role(school_id, auth.uid(), 'teacher'::member_role)
         or is_school_admin(school_id, auth.uid()))
  with check (has_school_role(school_id, auth.uid(), 'teacher'::member_role)
              or is_school_admin(school_id, auth.uid()));

-- ---------- question_banks ----------
create table public.question_banks (
  id uuid primary key default gen_random_uuid(),
  school_id uuid,
  scope public.bank_scope not null default 'school',
  name text not null,
  exam_body public.exam_body not null default 'school',
  subject_code text,
  managed_by uuid,
  created_at timestamptz not null default now(),
  constraint chk_bank_scope check (
    (scope = 'global' and school_id is null) or
    (scope = 'school' and school_id is not null)
  )
);
create index on public.question_banks (scope, exam_body, subject_code);

grant select on public.question_banks to authenticated;
grant insert, update, delete on public.question_banks to authenticated;
grant all on public.question_banks to service_role;
alter table public.question_banks enable row level security;

create policy "anyone reads global banks; members read school banks"
  on public.question_banks for select
  using (scope = 'global' or (school_id is not null and is_member(school_id, auth.uid())));

create policy "staff manage school banks"
  on public.question_banks for all
  using (scope = 'school' and school_id is not null
         and (has_school_role(school_id, auth.uid(), 'teacher'::member_role)
              or is_school_admin(school_id, auth.uid())))
  with check (scope = 'school' and school_id is not null
              and (has_school_role(school_id, auth.uid(), 'teacher'::member_role)
                   or is_school_admin(school_id, auth.uid())));

create policy "super manages global banks"
  on public.question_banks for all
  using (scope = 'global' and is_super_admin(auth.uid()))
  with check (scope = 'global' and is_super_admin(auth.uid()));

-- ---------- questions_v2 ----------
create table public.questions_v2 (
  id uuid primary key default gen_random_uuid(),
  school_id uuid,
  bank_id uuid references public.question_banks(id) on delete set null,
  assessment_id uuid references public.assessments(id) on delete cascade,
  section_id uuid references public.assessment_sections(id) on delete set null,
  type public.question_type not null default 'mcq',
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  correct jsonb not null default 'null'::jsonb,
  points integer not null default 1,
  difficulty public.question_difficulty not null default 'medium',
  topic text,
  subject_code text,
  exam_body public.exam_body,
  year integer,
  explanation text,
  media jsonb not null default '[]'::jsonb,
  ai_generated boolean not null default false,
  approved_by uuid,
  approved_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index on public.questions_v2 (assessment_id);
create index on public.questions_v2 (bank_id);
create index on public.questions_v2 (exam_body, subject_code, year);
create index on public.questions_v2 (school_id);

grant select, insert, update, delete on public.questions_v2 to authenticated;
grant all on public.questions_v2 to service_role;
alter table public.questions_v2 enable row level security;

-- Teachers/admins see all questions in their school + global bank questions
create policy "staff and bank readers view questions"
  on public.questions_v2 for select
  using (
    (school_id is not null and (
       has_school_role(school_id, auth.uid(), 'teacher'::member_role)
       or is_school_admin(school_id, auth.uid())))
    or (bank_id is not null and exists (
          select 1 from public.question_banks b
          where b.id = bank_id and b.scope = 'global'))
  );

create policy "staff manage questions in their school"
  on public.questions_v2 for all
  using (school_id is not null
         and (has_school_role(school_id, auth.uid(), 'teacher'::member_role)
              or is_school_admin(school_id, auth.uid())))
  with check (school_id is not null
              and (has_school_role(school_id, auth.uid(), 'teacher'::member_role)
                   or is_school_admin(school_id, auth.uid())));

create policy "super manages global bank questions"
  on public.questions_v2 for all
  using (is_super_admin(auth.uid()))
  with check (is_super_admin(auth.uid()));

-- ---------- assessment_attempts_v2 ----------
create table public.assessment_attempts_v2 (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  student_id uuid not null,
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  expires_at timestamptz,
  status public.attempt_status not null default 'in_progress',
  violations integer not null default 0,
  question_order uuid[] not null default '{}',
  meta jsonb not null default '{}'::jsonb
);
create index on public.assessment_attempts_v2 (assessment_id, student_id);
create index on public.assessment_attempts_v2 (school_id, student_id);

grant select, insert, update on public.assessment_attempts_v2 to authenticated;
grant all on public.assessment_attempts_v2 to service_role;
alter table public.assessment_attempts_v2 enable row level security;

create policy "student or staff view attempts"
  on public.assessment_attempts_v2 for select
  using (student_id = auth.uid()
         or has_school_role(school_id, auth.uid(), 'teacher'::member_role)
         or is_school_admin(school_id, auth.uid())
         or exists (select 1 from public.parent_links pl
                    where pl.school_id = assessment_attempts_v2.school_id
                      and pl.parent_user_id = auth.uid()
                      and pl.student_user_id = assessment_attempts_v2.student_id));

create policy "student creates own attempt"
  on public.assessment_attempts_v2 for insert
  with check (student_id = auth.uid()
              and has_school_role(school_id, auth.uid(), 'student'::member_role));

create policy "student updates own attempt"
  on public.assessment_attempts_v2 for update
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

-- ---------- assessment_answers_v2 ----------
create table public.assessment_answers_v2 (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts_v2(id) on delete cascade,
  question_id uuid not null references public.questions_v2(id) on delete cascade,
  school_id uuid not null,
  selected jsonb,
  is_correct boolean,
  points_awarded numeric,
  marked_for_review boolean not null default false,
  answered_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);
create index on public.assessment_answers_v2 (attempt_id);

grant select, insert, update, delete on public.assessment_answers_v2 to authenticated;
grant all on public.assessment_answers_v2 to service_role;
alter table public.assessment_answers_v2 enable row level security;

create policy "attempt owner or staff access answers"
  on public.assessment_answers_v2 for all
  using (exists (select 1 from public.assessment_attempts_v2 a
                 where a.id = attempt_id
                   and (a.student_id = auth.uid()
                        or has_school_role(a.school_id, auth.uid(), 'teacher'::member_role)
                        or is_school_admin(a.school_id, auth.uid()))))
  with check (exists (select 1 from public.assessment_attempts_v2 a
                      where a.id = attempt_id and a.student_id = auth.uid()));

-- ---------- assessment_violations_v2 ----------
create table public.assessment_violations_v2 (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.assessment_attempts_v2(id) on delete cascade,
  school_id uuid not null,
  type text not null,
  detail text,
  created_at timestamptz not null default now()
);
create index on public.assessment_violations_v2 (attempt_id);

grant select, insert on public.assessment_violations_v2 to authenticated;
grant all on public.assessment_violations_v2 to service_role;
alter table public.assessment_violations_v2 enable row level security;

create policy "owner inserts own violations"
  on public.assessment_violations_v2 for insert
  with check (exists (select 1 from public.assessment_attempts_v2 a
                      where a.id = attempt_id
                        and a.student_id = auth.uid()
                        and a.school_id = assessment_violations_v2.school_id));

create policy "owner/staff view violations"
  on public.assessment_violations_v2 for select
  using (exists (select 1 from public.assessment_attempts_v2 a
                 where a.id = attempt_id
                   and (a.student_id = auth.uid()
                        or has_school_role(a.school_id, auth.uid(), 'teacher'::member_role)
                        or is_school_admin(a.school_id, auth.uid()))));

-- ---------- assessment_results ----------
create table public.assessment_results (
  attempt_id uuid primary key references public.assessment_attempts_v2(id) on delete cascade,
  school_id uuid not null,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  student_id uuid not null,
  raw_score numeric not null default 0,
  max_score numeric not null default 0,
  percentage numeric not null default 0,
  grade text,
  position integer,
  per_section jsonb not null default '[]'::jsonb,
  per_topic jsonb not null default '[]'::jsonb,
  presenter text not null default 'school_test',
  projected jsonb not null default '{}'::jsonb,
  graded_at timestamptz not null default now()
);
create index on public.assessment_results (school_id, assessment_id);
create index on public.assessment_results (school_id, student_id);

-- writes via service_role / SECURITY DEFINER RPC only
grant select on public.assessment_results to authenticated;
grant all on public.assessment_results to service_role;
alter table public.assessment_results enable row level security;

create policy "student or staff view results"
  on public.assessment_results for select
  using (student_id = auth.uid()
         or has_school_role(school_id, auth.uid(), 'teacher'::member_role)
         or is_school_admin(school_id, auth.uid())
         or exists (select 1 from public.parent_links pl
                    where pl.school_id = assessment_results.school_id
                      and pl.parent_user_id = auth.uid()
                      and pl.student_user_id = assessment_results.student_id));

-- ---------- assessment_legacy_map ----------
create table public.assessment_legacy_map (
  id uuid primary key default gen_random_uuid(),
  legacy_kind text not null check (legacy_kind in ('exam','mock_session')),
  legacy_id uuid not null,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  attempt_legacy_id uuid,
  attempt_id uuid references public.assessment_attempts_v2(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (legacy_kind, legacy_id)
);

grant select on public.assessment_legacy_map to authenticated;
grant all on public.assessment_legacy_map to service_role;
alter table public.assessment_legacy_map enable row level security;

create policy "members read legacy map"
  on public.assessment_legacy_map for select
  using (exists (select 1 from public.assessments a
                 where a.id = assessment_id and is_member(a.school_id, auth.uid())));

-- =========================================================
-- RPCs
-- =========================================================

-- Returns questions for a given attempt without leaking correct answers.
create or replace function public.get_assessment_questions_for_attempt(_attempt_id uuid)
returns table (
  q_id uuid, q_section_id uuid, q_position integer,
  q_type public.question_type, q_prompt text, q_options jsonb,
  q_points integer, q_topic text, q_subject_code text, q_media jsonb
)
language plpgsql stable security definer set search_path = public
as $$
declare v_school uuid; v_student uuid; v_assessment uuid; v_order uuid[];
begin
  select a.school_id, a.student_id, a.assessment_id, a.question_order
    into v_school, v_student, v_assessment, v_order
  from public.assessment_attempts_v2 a
  where a.id = _attempt_id;
  if v_school is null then raise exception 'attempt not found'; end if;
  if not (v_student = auth.uid()
          or has_school_role(v_school, auth.uid(), 'teacher'::member_role)
          or is_school_admin(v_school, auth.uid())) then
    raise exception 'forbidden';
  end if;
  return query
  select q.id, q.section_id,
         coalesce(array_position(v_order, q.id), 0) as q_position,
         q.type, q.prompt, q.options, q.points, q.topic, q.subject_code, q.media
  from public.questions_v2 q
  where q.assessment_id = v_assessment
  order by case when array_length(v_order,1) is null then null
                else array_position(v_order, q.id) end nulls last, q.created_at;
end $$;

-- Review payload (only after submit), with correctness.
create or replace function public.get_assessment_review(_attempt_id uuid)
returns table (
  q_id uuid, q_position integer, q_prompt text, q_options jsonb,
  q_points integer, q_correct jsonb, q_selected jsonb,
  q_is_correct boolean, q_explanation text, q_topic text, q_subject_code text
)
language plpgsql stable security definer set search_path = public
as $$
declare v_school uuid; v_student uuid; v_assessment uuid; v_submitted timestamptz;
begin
  select a.school_id, a.student_id, a.assessment_id, a.submitted_at
    into v_school, v_student, v_assessment, v_submitted
  from public.assessment_attempts_v2 a
  where a.id = _attempt_id;
  if v_school is null then raise exception 'attempt not found'; end if;
  if v_submitted is null then raise exception 'attempt not submitted'; end if;
  if not (v_student = auth.uid()
          or has_school_role(v_school, auth.uid(), 'teacher'::member_role)
          or is_school_admin(v_school, auth.uid())) then
    raise exception 'forbidden';
  end if;
  return query
  select q.id, row_number() over (order by q.created_at)::int,
         q.prompt, q.options, q.points, q.correct,
         ans.selected, ans.is_correct, q.explanation, q.topic, q.subject_code
  from public.questions_v2 q
  left join public.assessment_answers_v2 ans
    on ans.question_id = q.id and ans.attempt_id = _attempt_id
  where q.assessment_id = v_assessment
  order by q.created_at;
end $$;

-- Start an attempt with open-window enforcement.
create or replace function public.start_assessment(_assessment_id uuid)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_school uuid; v_status public.assessment_status_v2;
        v_opens timestamptz; v_closes timestamptz;
        v_duration int; v_attempt uuid;
        v_existing uuid; v_order uuid[]; v_randomize boolean;
        v_config jsonb;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select a.school_id, a.status, a.opens_at, a.closes_at, a.config
    into v_school, v_status, v_opens, v_closes, v_config
  from public.assessments a where a.id = _assessment_id;
  if v_school is null then raise exception 'assessment not found'; end if;
  if v_status <> 'published' and v_status <> 'scheduled' then
    raise exception 'assessment not available';
  end if;
  if v_opens is not null and now() < v_opens then raise exception 'not open yet'; end if;
  if v_closes is not null and now() > v_closes then raise exception 'closed'; end if;
  if not has_school_role(v_school, auth.uid(), 'student'::member_role) then
    raise exception 'forbidden';
  end if;

  -- Resume in-progress attempt if any
  select id into v_existing
  from public.assessment_attempts_v2
  where assessment_id = _assessment_id and student_id = auth.uid()
    and status = 'in_progress'
  limit 1;
  if v_existing is not null then return v_existing; end if;

  v_duration := coalesce((v_config->>'duration_minutes')::int, 60);
  v_randomize := coalesce((v_config->>'randomize')::boolean, false);

  if v_randomize then
    select coalesce(array_agg(id order by random()), '{}')
      into v_order
      from public.questions_v2 where assessment_id = _assessment_id;
  else
    select coalesce(array_agg(id order by created_at), '{}')
      into v_order
      from public.questions_v2 where assessment_id = _assessment_id;
  end if;

  insert into public.assessment_attempts_v2
    (school_id, assessment_id, student_id, expires_at, question_order)
  values
    (v_school, _assessment_id, auth.uid(), now() + (v_duration || ' minutes')::interval, v_order)
  returning id into v_attempt;

  return v_attempt;
end $$;

-- Grade an attempt and produce results.
create or replace function public.submit_assessment(_attempt_id uuid)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_school uuid; v_student uuid; v_assessment uuid; v_submitted timestamptz;
        v_raw numeric := 0; v_max numeric := 0; v_pct numeric := 0;
        v_type public.assessment_type; v_grade text;
        v_per_section jsonb; v_per_topic jsonb; v_projected jsonb := '{}'::jsonb;
        rec record;
begin
  select a.school_id, a.student_id, a.assessment_id, a.submitted_at
    into v_school, v_student, v_assessment, v_submitted
  from public.assessment_attempts_v2 a where a.id = _attempt_id for update;
  if v_school is null then raise exception 'attempt not found'; end if;
  if v_student <> auth.uid()
     and not has_school_role(v_school, auth.uid(), 'teacher'::member_role)
     and not is_school_admin(v_school, auth.uid()) then
    raise exception 'forbidden';
  end if;
  if v_submitted is not null then raise exception 'already submitted'; end if;

  -- mark per-answer correctness
  update public.assessment_answers_v2 ans
    set is_correct = (ans.selected is not distinct from q.correct),
        points_awarded = case when ans.selected is not distinct from q.correct
                              then q.points else 0 end
    from public.questions_v2 q
    where ans.question_id = q.id and ans.attempt_id = _attempt_id;

  select coalesce(sum(points_awarded),0) into v_raw
    from public.assessment_answers_v2 where attempt_id = _attempt_id;
  select coalesce(sum(points),0) into v_max
    from public.questions_v2 where assessment_id = v_assessment;
  v_pct := case when v_max > 0 then round((v_raw / v_max) * 100, 2) else 0 end;

  select type into v_type from public.assessments where id = v_assessment;

  v_grade := case
    when v_pct >= 75 then 'A'
    when v_pct >= 60 then 'B'
    when v_pct >= 50 then 'C'
    when v_pct >= 45 then 'D'
    when v_pct >= 40 then 'E'
    else 'F' end;

  select coalesce(jsonb_agg(jsonb_build_object(
    'subject', q.subject_code,
    'score', sum(coalesce(ans.points_awarded,0)),
    'max', sum(q.points),
    'pct', case when sum(q.points) > 0
                then round(sum(coalesce(ans.points_awarded,0))/sum(q.points)*100,2)
                else 0 end
  )), '[]'::jsonb)
  into v_per_section
  from public.questions_v2 q
  left join public.assessment_answers_v2 ans
    on ans.question_id = q.id and ans.attempt_id = _attempt_id
  where q.assessment_id = v_assessment and q.subject_code is not null
  group by q.subject_code;

  select coalesce(jsonb_agg(jsonb_build_object(
    'topic', q.topic,
    'mastery', case when count(*) > 0
                    then round(sum(case when ans.is_correct then 1 else 0 end)::numeric/count(*)*100,2)
                    else 0 end,
    'n', count(*)
  )), '[]'::jsonb)
  into v_per_topic
  from public.questions_v2 q
  left join public.assessment_answers_v2 ans
    on ans.question_id = q.id and ans.attempt_id = _attempt_id
  where q.assessment_id = v_assessment and q.topic is not null
  group by q.topic;

  if v_type = 'jamb_mock' then
    v_projected := jsonb_build_object(
      'jamb_total', round(v_pct * 4),
      'scale', '400'
    );
  end if;

  update public.assessment_attempts_v2
    set submitted_at = now(), status = 'submitted'
    where id = _attempt_id;

  insert into public.assessment_results
    (attempt_id, school_id, assessment_id, student_id,
     raw_score, max_score, percentage, grade,
     per_section, per_topic, presenter, projected)
  values
    (_attempt_id, v_school, v_assessment, v_student,
     v_raw, v_max, v_pct, v_grade,
     v_per_section, v_per_topic, v_type::text, v_projected)
  on conflict (attempt_id) do update
    set raw_score = excluded.raw_score,
        max_score = excluded.max_score,
        percentage = excluded.percentage,
        grade = excluded.grade,
        per_section = excluded.per_section,
        per_topic = excluded.per_topic,
        projected = excluded.projected,
        graded_at = now();

  return jsonb_build_object(
    'attempt_id', _attempt_id,
    'percentage', v_pct,
    'grade', v_grade,
    'raw_score', v_raw,
    'max_score', v_max,
    'per_section', v_per_section,
    'projected', v_projected,
    'presenter', v_type::text
  );
end $$;

-- Publish only if every AI-generated question is approved.
create or replace function public.publish_assessment(_assessment_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare v_school uuid; v_pending int;
begin
  select school_id into v_school from public.assessments where id = _assessment_id;
  if v_school is null then raise exception 'assessment not found'; end if;
  if not (has_school_role(v_school, auth.uid(), 'teacher'::member_role)
          or is_school_admin(v_school, auth.uid())) then
    raise exception 'forbidden';
  end if;

  select count(*) into v_pending
    from public.questions_v2
   where assessment_id = _assessment_id
     and ai_generated = true
     and approved_by is null;
  if v_pending > 0 then
    raise exception 'cannot publish: % AI question(s) pending approval', v_pending;
  end if;

  update public.assessments
    set status = 'published', updated_at = now()
    where id = _assessment_id;
end $$;

-- Unified student-facing view
create or replace view public.student_assessments_v
with (security_invoker = true) as
select a.id as assessment_id, a.school_id, a.title, a.type, a.status,
       a.scheduled_at, a.opens_at, a.closes_at,
       att.id as attempt_id, att.status as attempt_status,
       r.percentage, r.grade
from public.assessments a
left join public.assessment_attempts_v2 att
  on att.assessment_id = a.id and att.student_id = auth.uid()
left join public.assessment_results r on r.attempt_id = att.id
where a.status in ('scheduled','published');

grant select on public.student_assessments_v to authenticated;
