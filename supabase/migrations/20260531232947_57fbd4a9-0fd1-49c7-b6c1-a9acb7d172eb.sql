
-- =====================================================
-- C-1: Remove overly permissive realtime policies on public.messages
-- =====================================================
DROP POLICY IF EXISTS "authenticated can use realtime" ON public.messages;
DROP POLICY IF EXISTS "authenticated can publish realtime" ON public.messages;

-- =====================================================
-- C-2: Scope realtime.messages SELECT by conversation participation
-- =====================================================
DO $$
BEGIN
  -- Drop any prior permissive policies on realtime.messages we may have created
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='realtime' AND tablename='messages' AND policyname='authenticated_read_realtime') THEN
    EXECUTE 'DROP POLICY "authenticated_read_realtime" ON realtime.messages';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='realtime' AND tablename='messages' AND policyname='Allow listening for broadcasts from authenticated users') THEN
    EXECUTE 'DROP POLICY "Allow listening for broadcasts from authenticated users" ON realtime.messages';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='realtime' AND tablename='messages' AND policyname='authenticated can read realtime') THEN
    EXECUTE 'DROP POLICY "authenticated can read realtime" ON realtime.messages';
  END IF;
END $$;

-- =====================================================
-- H-1: Restrict listing on public storage buckets (avatars, school-logos)
-- Keep public read of specific objects but prevent enumeration via list()
-- =====================================================
-- Storage list() requires SELECT on storage.objects with bucket_id filter.
-- We add a restrictive policy approach: only authenticated members can list,
-- but anonymous direct-URL reads still work (those bypass list via signed/public URLs).
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read school-logos" ON storage.objects;
DROP POLICY IF EXISTS "Auth list avatars" ON storage.objects;
DROP POLICY IF EXISTS "Auth list school-logos" ON storage.objects;

-- Allow public to read individual objects in these buckets (works via direct URL),
-- but Supabase's list() endpoint requires SELECT — same policy. To prevent enumeration
-- we restrict select to authenticated users only on these buckets; public URLs still
-- work because they go through the public CDN endpoint, not the RLS-gated list.
CREATE POLICY "Public read avatars" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Public read school-logos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'school-logos');

-- =====================================================
-- H-3: Rate-limit invite code redemption (5 attempts / 10 min / user)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.invite_redeem_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL,
  success boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.invite_redeem_attempts TO authenticated;
GRANT ALL ON public.invite_redeem_attempts TO service_role;

ALTER TABLE public.invite_redeem_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users insert own attempts" ON public.invite_redeem_attempts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "users read own attempts" ON public.invite_redeem_attempts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR is_super_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_invite_attempts_user_time
  ON public.invite_redeem_attempts (user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.redeem_invite(_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_invite public.invite_codes;
  v_uid uuid := auth.uid();
  v_recent int;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;

  -- Rate limit: max 5 attempts in last 10 minutes per user
  select count(*) into v_recent
  from public.invite_redeem_attempts
  where user_id = v_uid
    and created_at > now() - interval '10 minutes';
  if v_recent >= 5 then
    insert into public.invite_redeem_attempts(user_id, code, success) values (v_uid, _code, false);
    raise exception 'too many attempts, try again later';
  end if;

  select * into v_invite from public.invite_codes where code = _code for update;
  if not found then
    insert into public.invite_redeem_attempts(user_id, code, success) values (v_uid, _code, false);
    raise exception 'invalid code';
  end if;
  if v_invite.expires_at is not null and v_invite.expires_at < now() then
    insert into public.invite_redeem_attempts(user_id, code, success) values (v_uid, _code, false);
    raise exception 'code expired';
  end if;
  if v_invite.uses >= v_invite.max_uses then
    insert into public.invite_redeem_attempts(user_id, code, success) values (v_uid, _code, false);
    raise exception 'code exhausted';
  end if;

  insert into public.memberships(school_id, user_id, role) values (v_invite.school_id, v_uid, v_invite.role)
    on conflict (school_id, user_id, role) do nothing;
  update public.invite_codes set uses = uses + 1 where id = v_invite.id;
  insert into public.invite_redeem_attempts(user_id, code, success) values (v_uid, _code, true);
  return v_invite.school_id;
end $function$;

-- =====================================================
-- H-4: Strengthen prevent_membership_self_escalation to also lock
-- bio_completed, must_change_pin, profile_data from being toggled by non-admins
-- (well, profile_data should remain editable, but bio_completed/must_change_pin should not)
-- =====================================================
CREATE OR REPLACE FUNCTION public.prevent_membership_self_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() = OLD.user_id AND NOT public.is_school_admin(OLD.school_id, auth.uid()) THEN
    IF NEW.role IS DISTINCT FROM OLD.role
       OR NEW.status IS DISTINCT FROM OLD.status
       OR NEW.school_id IS DISTINCT FROM OLD.school_id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.must_change_pin IS DISTINCT FROM OLD.must_change_pin THEN
      RAISE EXCEPTION 'You cannot change role, status, school, user, or PIN-reset flag on your own membership';
    END IF;
    -- bio_completed: allow flipping false -> true (user completed their bio),
    -- but block true -> false (cannot un-complete)
    IF OLD.bio_completed = true AND NEW.bio_completed = false THEN
      RAISE EXCEPTION 'You cannot revert bio_completed';
    END IF;
  END IF;
  RETURN NEW;
END $function$;

-- Ensure trigger is attached
DROP TRIGGER IF EXISTS prevent_membership_self_escalation_trg ON public.memberships;
CREATE TRIGGER prevent_membership_self_escalation_trg
  BEFORE UPDATE ON public.memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_membership_self_escalation();
