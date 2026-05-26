-- 1) Drop redundant/risky INSERT policy on support_messages.
-- The "ticket parties write messages" policy already covers ticket openers (with internal=false),
-- school admins (with internal=false) and super admins. Dropping the duplicate eliminates any
-- chance of bypassing the internal-note guard through overlapping permissive policies.
DROP POLICY IF EXISTS "ticket parties post messages" ON public.support_messages;

-- 2) Remove sensitive analytics tables from realtime publication so authenticated
-- non-super-admin subscribers cannot receive page_view / auth_event row broadcasts.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'page_views'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.page_views';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'auth_events'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.auth_events';
  END IF;
END $$;