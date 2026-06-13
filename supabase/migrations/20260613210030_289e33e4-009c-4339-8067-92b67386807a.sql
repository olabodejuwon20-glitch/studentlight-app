
-- 1) admin_role_slots: per-school, exactly 3 named slots
CREATE TABLE IF NOT EXISTS public.admin_role_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  slot smallint NOT NULL CHECK (slot BETWEEN 1 AND 3),
  name text NOT NULL DEFAULT '',
  enabled boolean NOT NULL DEFAULT false,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (school_id, slot)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_role_slots TO authenticated;
GRANT ALL ON public.admin_role_slots TO service_role;

ALTER TABLE public.admin_role_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage role slots" ON public.admin_role_slots
  FOR ALL TO authenticated
  USING (public.is_school_admin(school_id, auth.uid()))
  WITH CHECK (public.is_school_admin(school_id, auth.uid()));

CREATE POLICY "Members read role slots" ON public.admin_role_slots
  FOR SELECT TO authenticated
  USING (public.is_member(school_id, auth.uid()));

CREATE POLICY "Super reads role slots" ON public.admin_role_slots
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE TRIGGER admin_role_slots_set_updated_at
  BEFORE UPDATE ON public.admin_role_slots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) Add admin_slot to invites + memberships
ALTER TABLE public.invite_codes
  ADD COLUMN IF NOT EXISTS admin_slot smallint
  CHECK (admin_slot IS NULL OR admin_slot BETWEEN 1 AND 3);

ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS admin_slot smallint
  CHECK (admin_slot IS NULL OR admin_slot BETWEEN 1 AND 3);

-- 3) Update redeem_invite to carry admin_slot
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

  insert into public.memberships(school_id, user_id, role, admin_slot)
    values (v_invite.school_id, v_uid, v_invite.role, v_invite.admin_slot)
    on conflict (school_id, user_id, role) do update
      set admin_slot = coalesce(excluded.admin_slot, public.memberships.admin_slot);

  update public.invite_codes set uses = uses + 1 where id = v_invite.id;
  insert into public.invite_redeem_attempts(user_id, code, success) values (v_uid, _code, true);
  return v_invite.school_id;
end $function$;

-- 4) Tighten self-escalation guard to also lock admin_slot
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
       OR NEW.must_change_pin IS DISTINCT FROM OLD.must_change_pin
       OR NEW.admin_slot IS DISTINCT FROM OLD.admin_slot THEN
      RAISE EXCEPTION 'You cannot change role, status, school, user, slot, or PIN-reset flag on your own membership';
    END IF;
    IF OLD.bio_completed = true AND NEW.bio_completed = false THEN
      RAISE EXCEPTION 'You cannot revert bio_completed';
    END IF;
  END IF;
  RETURN NEW;
END $function$;
