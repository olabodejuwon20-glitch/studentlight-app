
create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  author uuid not null,
  body text not null,
  internal boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists support_messages_ticket_idx on public.support_messages(ticket_id);
alter table public.support_messages enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='support_messages' and policyname='super manages ticket messages') then
    create policy "super manages ticket messages" on public.support_messages
      for all using (public.is_super_admin(auth.uid())) with check (public.is_super_admin(auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where tablename='support_messages' and policyname='ticket parties read messages') then
    create policy "ticket parties read messages" on public.support_messages
      for select using (
        exists(select 1 from public.support_tickets t
          where t.id = ticket_id
          and (public.is_super_admin(auth.uid()) or (public.is_school_admin(t.school_id, auth.uid()) and not internal)))
      );
  end if;
  if not exists (select 1 from pg_policies where tablename='support_messages' and policyname='ticket parties post messages') then
    create policy "ticket parties post messages" on public.support_messages
      for insert with check (
        author = auth.uid()
        and exists(select 1 from public.support_tickets t
          where t.id = ticket_id
          and (public.is_super_admin(auth.uid()) or (public.is_school_admin(t.school_id, auth.uid()) and not internal)))
      );
  end if;
end $$;
