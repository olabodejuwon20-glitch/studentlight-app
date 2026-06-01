-- Enable pgvector
create extension if not exists vector;

-- Documents registry
create table public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  uploaded_by uuid,
  title text not null,
  source_path text,                       -- storage path inside `library` bucket
  source_kind text not null default 'upload',  -- upload | url | manual
  mime_type text,
  visibility text not null default 'school',   -- school | class | student | public_curriculum
  class_id uuid,
  student_id uuid,
  subject_code text,
  curriculum text,                        -- WAEC | NECO | JAMB | custom
  status text not null default 'pending', -- pending | processing | ready | error
  error text,
  chunk_count int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_knowledge_documents_school on public.knowledge_documents(school_id, status);
create index idx_knowledge_documents_class on public.knowledge_documents(class_id) where class_id is not null;

grant select, insert, update, delete on public.knowledge_documents to authenticated;
grant all on public.knowledge_documents to service_role;
alter table public.knowledge_documents enable row level security;

create policy "members read documents"
  on public.knowledge_documents for select to authenticated
  using (public.is_member(school_id, auth.uid()));
create policy "teachers/admins insert documents"
  on public.knowledge_documents for insert to authenticated
  with check (
    public.has_school_role(school_id, auth.uid(), 'teacher'::member_role)
    or public.is_school_admin(school_id, auth.uid())
  );
create policy "teachers/admins update documents"
  on public.knowledge_documents for update to authenticated
  using (
    public.has_school_role(school_id, auth.uid(), 'teacher'::member_role)
    or public.is_school_admin(school_id, auth.uid())
  );
create policy "admins delete documents"
  on public.knowledge_documents for delete to authenticated
  using (public.is_school_admin(school_id, auth.uid()));

create trigger trg_knowledge_documents_updated
  before update on public.knowledge_documents
  for each row execute function public.set_updated_at();

-- Chunks
create table public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  school_id uuid not null,                -- denormalised for fast RLS filter
  chunk_index int not null,
  content text not null,
  token_count int,
  embedding vector(1536) not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index idx_knowledge_chunks_doc on public.knowledge_chunks(document_id);
create index idx_knowledge_chunks_school on public.knowledge_chunks(school_id);
create index idx_knowledge_chunks_embedding
  on public.knowledge_chunks using hnsw (embedding vector_cosine_ops);

grant select on public.knowledge_chunks to authenticated;
grant all on public.knowledge_chunks to service_role;
alter table public.knowledge_chunks enable row level security;

create policy "members read chunks"
  on public.knowledge_chunks for select to authenticated
  using (public.is_member(school_id, auth.uid()));

-- Tenant-scoped similarity search RPC
create or replace function public.match_knowledge_chunks(
  _school_id uuid,
  _query_embedding vector(1536),
  _match_count int default 6,
  _class_id uuid default null,
  _student_id uuid default null
)
returns table (
  chunk_id uuid,
  document_id uuid,
  title text,
  content text,
  similarity float,
  visibility text,
  metadata jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id as chunk_id,
    c.document_id,
    d.title,
    c.content,
    1 - (c.embedding <=> _query_embedding) as similarity,
    d.visibility,
    c.metadata
  from public.knowledge_chunks c
  join public.knowledge_documents d on d.id = c.document_id
  where c.school_id = _school_id
    and d.status = 'ready'
    and (
      d.visibility = 'school'
      or d.visibility = 'public_curriculum'
      or (d.visibility = 'class'   and _class_id   is not null and d.class_id   = _class_id)
      or (d.visibility = 'student' and _student_id is not null and d.student_id = _student_id)
    )
  order by c.embedding <=> _query_embedding
  limit greatest(1, least(_match_count, 20));
$$;

grant execute on function public.match_knowledge_chunks(uuid, vector, int, uuid, uuid) to authenticated, service_role;