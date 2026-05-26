
-- 1) Fix internal support message leak to school admins
DROP POLICY IF EXISTS "ticket parties read messages" ON public.support_messages;
CREATE POLICY "ticket parties read messages" ON public.support_messages
FOR SELECT USING (
  is_super_admin(auth.uid()) OR EXISTS (
    SELECT 1 FROM public.support_tickets t
    WHERE t.id = support_messages.ticket_id AND (
      (t.school_id IS NOT NULL AND is_school_admin(t.school_id, auth.uid()) AND support_messages.internal = false)
      OR (t.opened_by = auth.uid() AND support_messages.internal = false)
    )
  )
);

-- 2) Lock down realtime.messages so only authenticated sessions can use realtime channels.
-- (postgres_changes still enforces underlying public.* table RLS for row payloads.)
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "authenticated can use realtime" ON realtime.messages;
CREATE POLICY "authenticated can use realtime" ON realtime.messages
FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "authenticated can publish realtime" ON realtime.messages;
CREATE POLICY "authenticated can publish realtime" ON realtime.messages
FOR INSERT TO authenticated WITH CHECK (true);
