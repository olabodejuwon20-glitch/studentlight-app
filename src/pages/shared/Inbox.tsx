import { useEffect, useMemo, useState } from "react";
import { useSchool } from "@/contexts/SchoolContext";
import { supabase } from "@/integrations/supabase/client";
import {
  listMyConversations,
  fetchMessages,
  fetchParticipants,
  sendMessage,
  markRead,
  openDirectConversation,
  useConversationsRealtime,
  relTime,
  type Conversation,
  type ConversationMessage,
} from "@/lib/comms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Search, Plus, Send, Megaphone, Users as UsersIcon, Inbox as InboxIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ConvRow = Conversation & { last_read_at: string | null; muted: boolean; archived: boolean };

interface MemberOption { user_id: string; full_name: string; role: string; }

export default function Inbox() {
  const { school, user } = useSchool();
  const [convs, setConvs] = useState<ConvRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [participants, setParticipants] = useState<Record<string, string>>({});
  const [members, setMembers] = useState<MemberOption[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "direct" | "broadcast" | "unread">("all");
  const [draft, setDraft] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);

  const refresh = async () => {
    if (!school || !user) return;
    const list = await listMyConversations(school.id, user.id);
    setConvs(list);
  };

  useConversationsRealtime(user?.id, refresh);

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [school?.id, user?.id]);

  // Load school members for compose + sender labels
  useEffect(() => {
    if (!school) return;
    (async () => {
      const { data: mems } = await supabase
        .from("memberships")
        .select("user_id, role")
        .eq("school_id", school.id)
        .eq("status", "active");
      const uids = Array.from(new Set((mems ?? []).map((m: any) => m.user_id)));
      if (!uids.length) return;
      const { data: profs } = await supabase.rpc("get_public_profiles", { _ids: uids });
      const profMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name || "Member"]));
      setMembers(
        (mems ?? [])
          .filter((m: any) => m.user_id !== user?.id)
          .map((m: any) => ({ user_id: m.user_id, full_name: profMap.get(m.user_id) || "Member", role: m.role }))
      );
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = p.full_name || "Member"; });
      setParticipants((prev) => ({ ...prev, ...map }));
    })();
  }, [school?.id, user?.id]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeId) { setMessages([]); return; }
    (async () => {
      const [msgs, parts] = await Promise.all([fetchMessages(activeId), fetchParticipants(activeId)]);
      setMessages(msgs);
      const missing = parts.map((p) => p.user_id).filter((id) => !participants[id]);
      if (missing.length) {
        const { data: profs } = await supabase.rpc("get_public_profiles", { _ids: missing });
        setParticipants((prev) => {
          const next = { ...prev };
          (profs ?? []).forEach((p: any) => { next[p.id] = p.full_name || "Member"; });
          return next;
        });
      }
      if (user) await markRead(activeId, user.id);
      refresh();
    })();
    // realtime subscribe to this conv
    const nonce = Math.random().toString(36).slice(2, 10);
    const ch = supabase
      .channel(`conv:${activeId}:${nonce}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "conversation_messages", filter: `conversation_id=eq.${activeId}` },
        (payload) => {
          setMessages((m) => [...m, payload.new as ConversationMessage]);
          if (user) markRead(activeId, user.id);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, [activeId]);

  const filtered = useMemo(() => {
    return convs.filter((c) => {
      if (filter === "direct" && c.kind !== "direct") return false;
      if (filter === "broadcast" && c.kind !== "broadcast") return false;
      if (filter === "unread") {
        const lr = c.last_read_at ? new Date(c.last_read_at).getTime() : 0;
        const lm = c.last_message_at ? new Date(c.last_message_at).getTime() : 0;
        if (!(lm > lr)) return false;
      }
      if (search) {
        const hay = (c.title || c.last_message_preview || "").toLowerCase();
        if (!hay.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [convs, filter, search]);

  const active = convs.find((c) => c.id === activeId);

  const handleSend = async () => {
    if (!draft.trim() || !activeId || !school || !user) return;
    const body = draft;
    setDraft("");
    try {
      await sendMessage({ conversationId: activeId, schoolId: school.id, senderId: user.id, body });
    } catch (e: any) {
      toast.error(e?.message || "Failed to send");
      setDraft(body);
    }
  };

  const startDM = async (otherId: string) => {
    if (!school || !user) return;
    try {
      const id = await openDirectConversation({ schoolId: school.id, meId: user.id, otherId });
      await refresh();
      setActiveId(id);
      setComposeOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Could not open conversation");
    }
  };

  const labelFor = (c: ConvRow) => {
    if (c.title) return c.title;
    if (c.kind === "broadcast") return "Broadcast";
    // direct: try to show other participant name (best-effort from cache via preview)
    return c.last_message_preview ? c.last_message_preview.slice(0, 40) : "Conversation";
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 h-[calc(100vh-180px)] min-h-[520px]">
      {/* Left rail */}
      <div className="rounded-xl border border-border bg-card flex flex-col min-h-0">
        <div className="p-3 border-b border-border flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="pl-8 h-9" />
          </div>
          <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
            <DialogTrigger asChild>
              <Button size="icon" variant="default" className="h-9 w-9"><Plus className="size-4" /></Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>New message</DialogTitle></DialogHeader>
              <ComposeNew members={members} onPick={startDM} />
            </DialogContent>
          </Dialog>
        </div>
        <div className="px-3 pt-2 flex gap-1 flex-wrap">
          {(["all", "direct", "broadcast", "unread"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={cn("text-xs px-2.5 py-1 rounded-full border capitalize",
                filter === f ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-secondary")}>
              {f}
            </button>
          ))}
        </div>
        <ScrollArea className="flex-1">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              <InboxIcon className="mx-auto size-8 mb-2 opacity-40" />
              No conversations yet
            </div>
          ) : filtered.map((c) => {
            const lr = c.last_read_at ? new Date(c.last_read_at).getTime() : 0;
            const lm = c.last_message_at ? new Date(c.last_message_at).getTime() : 0;
            const unread = lm > lr;
            return (
              <button key={c.id} onClick={() => setActiveId(c.id)}
                className={cn("w-full text-left px-3 py-3 border-b border-border/60 flex gap-3 items-start hover:bg-secondary/60 transition-colors",
                  activeId === c.id && "bg-secondary")}>
                <Avatar className="size-10 shrink-0">
                  <AvatarFallback className="text-xs">
                    {c.kind === "broadcast" ? <Megaphone className="size-4" /> : c.kind === "group" ? <UsersIcon className="size-4" /> : labelFor(c).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-sm truncate">{labelFor(c)}</div>
                    <div className="ml-auto text-[10px] text-muted-foreground shrink-0">{relTime(c.last_message_at)}</div>
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{c.last_message_preview || "No messages yet"}</div>
                </div>
                {unread && <span className="size-2 rounded-full bg-primary mt-2" />}
              </button>
            );
          })}
        </ScrollArea>
      </div>

      {/* Thread */}
      <div className="rounded-xl border border-border bg-card flex flex-col min-h-0">
        {!active ? (
          <div className="flex-1 grid place-items-center text-center text-sm text-muted-foreground p-10">
            <div>
              <InboxIcon className="mx-auto size-10 opacity-40 mb-3" />
              Select a conversation to start chatting
            </div>
          </div>
        ) : (
          <>
            <div className="px-4 py-3 border-b border-border flex items-center gap-3">
              <Avatar className="size-9">
                <AvatarFallback className="text-xs">
                  {active.kind === "broadcast" ? <Megaphone className="size-4" /> : labelFor(active).slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="font-semibold text-sm truncate">{labelFor(active)}</div>
                <div className="text-[11px] text-muted-foreground capitalize">{active.kind}</div>
              </div>
              {active.kind === "broadcast" && <Badge variant="secondary" className="ml-auto">Announcement</Badge>}
            </div>
            <ScrollArea className="flex-1 px-4 py-4">
              <div className="space-y-3">
                {messages.map((m) => {
                  const mine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={cn("flex gap-2", mine && "justify-end")}>
                      {!mine && (
                        <Avatar className="size-7 mt-0.5"><AvatarFallback className="text-[10px]">{(participants[m.sender_id] || "U").slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
                      )}
                      <div className={cn("max-w-[78%] rounded-2xl px-3.5 py-2 text-sm",
                        mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary rounded-bl-sm")}>
                        {!mine && <div className="text-[10px] font-semibold mb-0.5 opacity-80">{participants[m.sender_id] || "Member"}</div>}
                        <div className="whitespace-pre-wrap break-words">{m.body}</div>
                        <div className={cn("text-[10px] mt-1 opacity-70", mine && "text-right")}>{relTime(m.created_at)}</div>
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 && (
                  <div className="text-center text-xs text-muted-foreground py-10">No messages yet — say hello!</div>
                )}
              </div>
            </ScrollArea>
            <div className="p-3 border-t border-border flex gap-2 items-end">
              <Textarea value={draft} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder={active.kind === "broadcast" ? "Replies are disabled for broadcasts" : "Type a message…"}
                disabled={active.kind === "broadcast"}
                className="resize-none min-h-[44px] max-h-32" />
              <Button onClick={handleSend} disabled={!draft.trim() || active.kind === "broadcast"} className="h-11">
                <Send className="size-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ComposeNew({ members, onPick }: { members: MemberOption[]; onPick: (id: string) => void }) {
  const [q, setQ] = useState("");
  const filtered = members.filter((m) =>
    !q || m.full_name.toLowerCase().includes(q.toLowerCase()) || m.role.toLowerCase().includes(q.toLowerCase())
  ).slice(0, 50);
  return (
    <div className="space-y-3">
      <Input placeholder="Search by name or role" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      <div className="max-h-80 overflow-y-auto -mx-2">
        {filtered.length === 0 && <div className="px-4 py-6 text-sm text-muted-foreground text-center">No members found</div>}
        {filtered.map((m) => (
          <button key={m.user_id} onClick={() => onPick(m.user_id)}
            className="w-full text-left px-3 py-2 rounded-lg hover:bg-secondary flex items-center gap-3">
            <Avatar className="size-9"><AvatarFallback className="text-xs">{m.full_name.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium truncate">{m.full_name}</div>
              <div className="text-[11px] text-muted-foreground capitalize">{m.role}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}