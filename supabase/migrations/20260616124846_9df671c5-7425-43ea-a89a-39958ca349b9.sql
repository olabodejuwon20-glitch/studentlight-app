
DROP POLICY IF EXISTS "Profiles viewable by school co-members" ON public.profiles;

CREATE POLICY "Profiles viewable by staff co-members"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.memberships m1
      JOIN public.memberships m2 ON m1.school_id = m2.school_id
      WHERE m1.user_id = auth.uid()
        AND m1.status = 'active'
        AND m1.role IN ('admin','teacher')
        AND m2.user_id = profiles.id
        AND m2.status = 'active'
    )
  );

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
      JOIN public.memberships m_child  ON m_child.user_id  = pl.student_user_id AND m_child.status = 'active'
      JOIN public.memberships m_target ON m_target.school_id = m_child.school_id
                                      AND m_target.user_id   = profiles.id
                                      AND m_target.status    = 'active'
      WHERE pl.parent_user_id = auth.uid()
        AND m_target.role IN ('admin','teacher')
    )
  );

CREATE OR REPLACE VIEW public.public_profiles AS
SELECT p.id, p.full_name, p.photo_url
FROM public.profiles p
WHERE EXISTS (
  SELECT 1
  FROM public.memberships m1
  JOIN public.memberships m2 ON m1.school_id = m2.school_id
  WHERE m1.user_id = auth.uid() AND m1.status = 'active'
    AND m2.user_id = p.id AND m2.status = 'active'
)
OR p.id = auth.uid();

GRANT SELECT ON public.public_profiles TO authenticated;

REVOKE SELECT (correct_index) ON public.mock_questions FROM authenticated;

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated may read realtime topics for self" ON realtime.messages;
CREATE POLICY "Authenticated may read realtime topics for self"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (
      realtime.topic() LIKE '%' || auth.uid()::text || '%'
      OR public.is_super_admin(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated may publish realtime topics for self" ON realtime.messages;
CREATE POLICY "Authenticated may publish realtime topics for self"
  ON realtime.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (
      realtime.topic() LIKE '%' || auth.uid()::text || '%'
      OR public.is_super_admin(auth.uid())
    )
  );
