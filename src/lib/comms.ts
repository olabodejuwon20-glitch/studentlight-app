import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ConvKind = "direct" | "group" | "broadcast";

export interface Conversation {
  id: string;
  school_id: string;
  kind: ConvKind;
  title: string | null;
  created_by: string;
  last_message_at: string | null;
  last_message_preview: string | null;
  created_at: string;
}

export interface ConversationMessage {
  id: string;
  conversation_id: string;
  school_id: string;
  sender_id: string;
  body: string;
  attachments: any[];
  kind: "text" | "system";
  reply_to: string | null;
  created_at: string;
  edited_at: string | null;
}

export interface Participant {
  id: string;
  conversation_id: string;
  user_id: string;
  role_at_join: string | null;
  muted: boolean;
  archived: boolean;
  last_read_at: string | null;
}

/** List conversations the current user is a participant of, in a school. */
export async function listMyConversations(schoolId: string, userId: string) {
  const { data: parts, error: pErr } = await supabase
    .from("conversation_participants")
    .select("conversation_id, last_read_at, muted, archived")
    .eq("user_id", userId);
  if (pErr) throw pErr;
  const ids = (parts ?? []).map((p) => p.conversation_id);
  if (!ids.length) return [] as (Conversation & { last_read_at: string | null; muted: boolean; archived: boolean })[];
  const { data: convs, error } = await supabase
    .from("conversations")
    .select("*")
    .eq("school_id", schoolId)
    .in("id", ids)
    .order("last_message_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  const partMap = new Map((parts ?? []).map((p) => [p.conversation_id, p]));
  return (convs ?? []).map((c) => ({
    ...(c as Conversation),
    last_read_at: partMap.get(c.id)?.last_read_at ?? null,
    muted: !!partMap.get(c.id)?.muted,
    archived: !!partMap.get(c.id)?.archived,
  }));
}

export async function fetchMessages(conversationId: string) {
  const { data, error } = await supabase
    .from("conversation_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) throw error;
  return (data ?? []) as ConversationMessage[];
}

export async function fetchParticipants(conversationId: string) {
  const { data, error } = await supabase
    .from("conversation_participants")
    .select("*")
    .eq("conversation_id", conversationId);
  if (error) throw error;
  return (data ?? []) as Participant[];
}

export async function sendMessage(args: {
  conversationId: string;
  schoolId: string;
  senderId: string;
  body: string;
}) {
  const { error } = await supabase.from("conversation_messages").insert({
    conversation_id: args.conversationId,
    school_id: args.schoolId,
    sender_id: args.senderId,
    body: args.body.trim(),
  });
  if (error) throw error;
  // bump conversation preview
  await supabase
    .from("conversations")
    .update({ last_message_at: new Date().toISOString(), last_message_preview: args.body.slice(0, 140) })
    .eq("id", args.conversationId);
}

export async function markRead(conversationId: string, userId: string) {
  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);
}

/** Find or create a direct conversation between two members in a school. */
export async function openDirectConversation(args: {
  schoolId: string;
  meId: string;
  otherId: string;
}) {
  // Search existing direct convs where I participate, then check the other is a member
  const { data: mine } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", args.meId);
  const ids = (mine ?? []).map((p) => p.conversation_id);
  if (ids.length) {
    const { data: candidates } = await supabase
      .from("conversations")
      .select("id")
      .eq("school_id", args.schoolId)
      .eq("kind", "direct")
      .in("id", ids);
    const candidateIds = (candidates ?? []).map((c) => c.id);
    if (candidateIds.length) {
      const { data: shared } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", args.otherId)
        .in("conversation_id", candidateIds);
      if (shared && shared.length) return shared[0].conversation_id as string;
    }
  }
  // Create new
  const { data: conv, error } = await supabase
    .from("conversations")
    .insert({ school_id: args.schoolId, kind: "direct", created_by: args.meId })
    .select("id")
    .single();
  if (error) throw error;
  const convId = conv!.id as string;
  await supabase.from("conversation_participants").insert([
    { conversation_id: convId, user_id: args.meId },
    { conversation_id: convId, user_id: args.otherId },
  ]);
  return convId;
}

/** Subscribe to new messages across a user's conversations. */
export function useConversationsRealtime(userId: string | undefined, onChange: () => void) {
  useEffect(() => {
    if (!userId) return;
    const nonce = Math.random().toString(36).slice(2, 10);
    const ch = supabase
      .channel(`comms:${userId}:${nonce}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_messages" }, onChange)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, onChange)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);
}

export function useUnreadCount(schoolId: string | undefined, userId: string | undefined) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!schoolId || !userId) return;
    let alive = true;
    const load = async () => {
      const convs = await listMyConversations(schoolId, userId);
      let unread = 0;
      convs.forEach((c) => {
        if (c.archived) return;
        const lr = c.last_read_at ? new Date(c.last_read_at).getTime() : 0;
        const lm = c.last_message_at ? new Date(c.last_message_at).getTime() : 0;
        if (lm > lr) unread += 1;
      });
      if (alive) setCount(unread);
    };
    load();
    const nonce = Math.random().toString(36).slice(2, 10);
    const ch = supabase
      .channel(`comms-bell:${userId}:${nonce}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_messages" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversation_participants", filter: `user_id=eq.${userId}` }, load)
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [schoolId, userId]);
  return count;
}

export function relTime(iso?: string | null) {
  if (!iso) return "";
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "now";
  if (d < 3600) return `${Math.floor(d / 60)}m`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  if (d < 86400 * 7) return `${Math.floor(d / 86400)}d`;
  return new Date(iso).toLocaleDateString();
}