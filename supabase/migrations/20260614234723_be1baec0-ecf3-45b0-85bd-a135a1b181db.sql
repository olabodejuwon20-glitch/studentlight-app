
-- Files are organised as: <school_id>/<exam_id>/<filename>
-- The leading folder is the school_id which we check against memberships.

create policy "trad_assets_staff_read"
on storage.objects for select to authenticated
using (
  bucket_id = 'trad-exam-assets'
  and (
    public.is_school_admin((storage.foldername(name))[1]::uuid, auth.uid())
    or public.has_school_role((storage.foldername(name))[1]::uuid, auth.uid(), 'teacher'::member_role)
  )
);

create policy "trad_assets_staff_insert"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'trad-exam-assets'
  and (
    public.is_school_admin((storage.foldername(name))[1]::uuid, auth.uid())
    or public.has_school_role((storage.foldername(name))[1]::uuid, auth.uid(), 'teacher'::member_role)
  )
);

create policy "trad_assets_staff_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'trad-exam-assets'
  and (
    public.is_school_admin((storage.foldername(name))[1]::uuid, auth.uid())
    or public.has_school_role((storage.foldername(name))[1]::uuid, auth.uid(), 'teacher'::member_role)
  )
);

create policy "trad_assets_staff_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'trad-exam-assets'
  and (
    public.is_school_admin((storage.foldername(name))[1]::uuid, auth.uid())
    or public.has_school_role((storage.foldername(name))[1]::uuid, auth.uid(), 'teacher'::member_role)
  )
);
