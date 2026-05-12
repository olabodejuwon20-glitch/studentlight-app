create policy "Profiles viewable by school co-members"
on public.profiles for select
to authenticated
using (
  exists (
    select 1
    from public.memberships m1
    join public.memberships m2 on m1.school_id = m2.school_id
    where m1.user_id = auth.uid()
      and m1.status = 'active'
      and m2.user_id = profiles.id
      and m2.status = 'active'
  )
);