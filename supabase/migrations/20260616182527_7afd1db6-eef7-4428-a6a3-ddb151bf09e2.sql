
-- Replace prior realtime.messages policies with participant-aware checks for
-- conversation topics (format: 'conv:<conversation_uuid>[:...]'). Other topics
-- continue to require the user's UID to appear in the topic.

DROP POLICY IF EXISTS "Authenticated users can read scoped realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can send scoped realtime messages" ON realtime.messages;
DROP POLICY IF EXISTS "Realtime read scoped to user or conversation participant" ON realtime.messages;
DROP POLICY IF EXISTS "Realtime send scoped to user or conversation participant" ON realtime.messages;

CREATE POLICY "Realtime read scoped to user or conversation participant"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (
    realtime.topic() LIKE 'conv:%'
    AND EXISTS (
      SELECT 1
      FROM public.conversation_participants cp
      WHERE cp.user_id = auth.uid()
        AND cp.conversation_id::text = split_part(substring(realtime.topic() FROM 6), ':', 1)
    )
  )
  OR (
    realtime.topic() NOT LIKE 'conv:%'
    AND realtime.topic() LIKE '%' || auth.uid()::text || '%'
  )
);

CREATE POLICY "Realtime send scoped to user or conversation participant"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  (
    realtime.topic() LIKE 'conv:%'
    AND EXISTS (
      SELECT 1
      FROM public.conversation_participants cp
      WHERE cp.user_id = auth.uid()
        AND cp.conversation_id::text = split_part(substring(realtime.topic() FROM 6), ':', 1)
    )
  )
  OR (
    realtime.topic() NOT LIKE 'conv:%'
    AND realtime.topic() LIKE '%' || auth.uid()::text || '%'
  )
);
