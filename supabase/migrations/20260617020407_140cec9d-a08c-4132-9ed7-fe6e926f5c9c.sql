
DROP POLICY IF EXISTS "Profiles viewable by parents for linked users" ON public.profiles;

CREATE POLICY "Profiles viewable by parents for linked users"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parent_links pl
      WHERE pl.parent_user_id = auth.uid()
        AND pl.student_user_id = profiles.id
    )
    OR EXISTS (
      SELECT 1
      FROM public.parent_links pl
      JOIN public.class_enrollments ce
        ON ce.student_id = pl.student_user_id
      JOIN public.class_subject_teachers cst
        ON cst.class_id = ce.class_id
      WHERE pl.parent_user_id = auth.uid()
        AND cst.teacher_user_id = profiles.id
    )
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'platform_announcements'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.platform_announcements';
  END IF;
END $$;
