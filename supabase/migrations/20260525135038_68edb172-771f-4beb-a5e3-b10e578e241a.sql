
-- 1) Restrict anonymous read of schools to safe directory view only
DROP POLICY IF EXISTS "Anon directory read" ON public.schools;
GRANT SELECT ON public.school_directory TO anon, authenticated;

-- 2) Harden support_messages insert policy so ticket openers cannot set internal=true
DROP POLICY IF EXISTS "ticket parties write messages" ON public.support_messages;
CREATE POLICY "ticket parties write messages"
ON public.support_messages
FOR INSERT
TO authenticated
WITH CHECK (
  author = auth.uid()
  AND (
    is_super_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.support_tickets t
      WHERE t.id = support_messages.ticket_id
        AND (
          (t.school_id IS NOT NULL AND is_school_admin(t.school_id, auth.uid()))
          OR (t.opened_by = auth.uid() AND support_messages.internal = false)
        )
    )
  )
);
