
-- conversations
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null,
  kind text not null default 'direct' check (kind in ('direct','group','broadcast')),
  title text,
  created_by uuid not null,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.conversations enable row level security;

create table public.conversation_participants (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null,
  role_at_join text,
  muted boolean not null default false,
  archived boolean not null default false,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (conversation_id, user_id)
);
alter table public.conversation_participants enable row level security;
create index on public.conversation_participants(user_id);
create index on public.conversation_participants(conversation_id);

create table public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  school_id uuid not null,
  sender_id uuid not null,
  body text not null,
  attachments jsonb not null default '[]'::jsonb,
  kind text not null default 'text' check (kind in ('text','system')),
  reply_to uuid,
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
alter table public.conversation_messages enable row level security;
create index on public.conversation_messages(conversation_id, created_at desc);

-- helper: is user a participant?
create or replace function public.is_conversation_participant(_conv uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.conversation_participants where conversation_id=_conv and user_id=_user)
$$;

-- RLS: conversations
create policy "Participants or admins view conversations"
on public.conversations for select using (
  public.is_conversation_participant(id, auth.uid())
  or public.is_school_admin(school_id, auth.uid())
);
create policy "Members create conversations"
on public.conversations for insert with check (
  created_by = auth.uid() and public.is_member(school_id, auth.uid())
);
create policy "Creator or admin update conversations"
on public.conversations for update using (
  created_by = auth.uid() or public.is_school_admin(school_id, auth.uid())
) with check (
  created_by = auth.uid() or public.is_school_admin(school_id, auth.uid())
);

-- RLS: participants
create policy "View participants of own conversations or as admin"
on public.conversation_participants for select using (
  user_id = auth.uid()
  or public.is_conversation_participant(conversation_id, auth.uid())
  or exists(select 1 from public.conversations c where c.id=conversation_id and public.is_school_admin(c.school_id, auth.uid()))
);
create policy "Add participants when member of school"
on public.conversation_participants for insert with check (
  exists(select 1 from public.conversations c where c.id=conversation_id and public.is_member(c.school_id, auth.uid()))
);
create policy "User updates own participant row"
on public.conversation_participants for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Admin removes participants"
on public.conversation_participants for delete using (
  exists(select 1 from public.conversations c where c.id=conversation_id and public.is_school_admin(c.school_id, auth.uid()))
);

-- RLS: messages
create policy "Participants read messages"
on public.conversation_messages for select using (
  public.is_conversation_participant(conversation_id, auth.uid())
  or public.is_school_admin(school_id, auth.uid())
);
create policy "Participants send messages"
on public.conversation_messages for insert with check (
  sender_id = auth.uid() and public.is_conversation_participant(conversation_id, auth.uid())
);
create policy "Sender edits own recent message"
on public.conversation_messages for update using (
  sender_id = auth.uid() and created_at > now() - interval '5 minutes'
) with check (sender_id = auth.uid());

-- updated_at trigger
create trigger conversations_set_updated_at
before update on public.conversations
for each row execute function public.set_updated_at();

-- realtime
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.conversation_messages;
alter publication supabase_realtime add table public.conversation_participants;
alter table public.conversations replica identity full;
alter table public.conversation_messages replica identity full;
alter table public.conversation_participants replica identity full;
