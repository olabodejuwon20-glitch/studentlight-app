
-- 1. exam_questions: hide correct_index from clients (column-level revoke)
REVOKE SELECT ON public.exam_questions FROM anon, authenticated;
GRANT SELECT (id, exam_id, school_id, prompt, options, points, position) ON public.exam_questions TO anon, authenticated;
-- INSERT/UPDATE/DELETE still gated by RLS for teachers/admins
GRANT INSERT, UPDATE, DELETE ON public.exam_questions TO authenticated;

-- 2. invite_codes: remove public lookup; flow uses edge function (service role)
DROP POLICY IF EXISTS "Public lookup invite by code" ON public.invite_codes;

-- 3. platform_settings: super-only
DROP POLICY IF EXISTS "anyone reads platform settings" ON public.platform_settings;
-- The existing "super manages platform settings" ALL policy covers super-admin reads.

-- 4. schools: drop anon read, expose safe directory view
DROP POLICY IF EXISTS "Public schools read" ON public.schools;
CREATE OR REPLACE VIEW public.school_directory
WITH (security_invoker = true) AS
  SELECT id, slug, name, logo_url, motto FROM public.schools;
GRANT SELECT ON public.school_directory TO anon, authenticated;
-- Allow the view to actually see rows for anon via a narrow policy that returns only safe columns is impossible at policy level;
-- Instead add a permissive anon policy that returns rows but the view exposes only safe columns:
CREATE POLICY "Anon directory read"
  ON public.schools FOR SELECT TO anon
  USING (true);
-- Note: the above looks identical to the old policy, BUT clients must use the view; we additionally revoke broad column SELECT for anon:
REVOKE SELECT ON public.schools FROM anon;
GRANT SELECT (id, slug, name, logo_url, motto) ON public.schools TO anon;

-- 5. memberships: trigger to prevent role/status self-escalation
CREATE OR REPLACE FUNCTION public.prevent_membership_self_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF auth.uid() = OLD.user_id AND NOT public.is_school_admin(OLD.school_id, auth.uid()) THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.school_id IS DISTINCT FROM OLD.school_id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      RAISE EXCEPTION 'You cannot change role, status, school, or user on your own membership';
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS memberships_prevent_self_escalation ON public.memberships;
CREATE TRIGGER memberships_prevent_self_escalation
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW EXECUTE FUNCTION public.prevent_membership_self_escalation();

-- 6. user_roles: prevent self insert (closes super_admin self-grant)
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;

-- 7. attendance: tighten
DROP POLICY IF EXISTS "Members view attendance" ON public.attendance;
CREATE POLICY "View attendance scoped"
  ON public.attendance FOR SELECT
  USING (
    student_id = auth.uid()
    OR public.has_school_role(school_id, auth.uid(), 'teacher'::member_role)
    OR public.is_school_admin(school_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.parent_links pl
      WHERE pl.school_id = attendance.school_id
        AND pl.parent_user_id = auth.uid()
        AND pl.student_user_id = attendance.student_id
    )
  );

-- 8. class_enrollments: tighten
DROP POLICY IF EXISTS "Members view enrollments" ON public.class_enrollments;
CREATE POLICY "View enrollments scoped"
  ON public.class_enrollments FOR SELECT
  USING (
    student_id = auth.uid()
    OR public.has_school_role(school_id, auth.uid(), 'teacher'::member_role)
    OR public.is_school_admin(school_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.parent_links pl
      WHERE pl.school_id = class_enrollments.school_id
        AND pl.parent_user_id = auth.uid()
        AND pl.student_user_id = class_enrollments.student_id
    )
  );

-- 9. set_updated_at: fixed search_path
ALTER FUNCTION public.set_updated_at() SET search_path = public;
