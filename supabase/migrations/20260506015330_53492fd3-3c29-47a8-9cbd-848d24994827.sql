-- Extend profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS dob date,
  ADD COLUMN IF NOT EXISTS gender text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS photo_url text;

-- Extend memberships
ALTER TABLE public.memberships
  ADD COLUMN IF NOT EXISTS bio_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS profile_data jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Allow user to update own membership (e.g. set bio_completed / profile_data)
DROP POLICY IF EXISTS "User updates own membership" ON public.memberships;
CREATE POLICY "User updates own membership"
ON public.memberships
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow anonymous lookup of invite code (needed so sign-in page can resolve school from code).
-- Existing policy allowed authenticated only; broaden to anon as well. Safe: code is the secret.
DROP POLICY IF EXISTS "Lookup invite by code" ON public.invite_codes;
CREATE POLICY "Public lookup invite by code"
ON public.invite_codes
FOR SELECT
TO anon, authenticated
USING (true);
