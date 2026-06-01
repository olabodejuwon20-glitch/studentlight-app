import { useEffect, useRef, useState } from "react";
import { MessagesSquare, Search, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Composer } from "@/components/tutor/Composer";
import { AttachmentView } from "@/components/tutor/MessageBubble";
import { Attachment } from "@/lib/uploads";

/** Messaging UI — peer list (school members) + thread view + composer. Wired to messages table. */
export function MessagesPanel() {
  const { school, user } = useSchool();
  const [peers, setPeers] = useState<any[]>([]);
  const [active, setActive] = useState<any | null>(null);
  const [thread, setThread] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [filter, setFilter] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!school || !user) return;
    (async () => {
      const { data: ms } = await supabase.from("memberships").select("user_id,role").eq("school_id", school.id).eq("status", "active").neq("user_id", user.id);
      const ids = (ms ?? []).map(m => m.user_id);
      if (!ids.length) return setPeers([]);
      const { data: profs } = await supabase.from("profiles").select("id,full_name,email,photo_url").in("id", ids);
      const map = new Map((profs ?? []).map(p => [p.id, p]));
      setPeers((ms ?? []).map(m => ({ ...m, profile: map.get(m.user_id) })));
    })();
  }, [school, user]);

  useEffect(() => {
    if (!active || !user) return;
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.from("messages").select("*").eq("school_id", school!.id)
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${active.user_id}),and(sender_id.eq.${active.user_id},recipient_id.eq.${user.id})`)
        .order("created_at", { ascending: true });
      if (!cancelled) setThread(data ?? []);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    };
    load();
    const ch = supabase.channel(`msg-${active.user_id}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => load()).subscribe();
    return () => { cancelled = true; supabase.removeChannel(ch); };
  }, [active, user, school]);

  async function send() {
    // legacy stub — composer handles sending now
  }

  async function sendComposer(body: string, attachments: Attachment[]) {
    if (!active || !user || !school) return;
    if (!body.trim() && !attachments.length) return;
    const { error } = await supabase.from("messages").insert({
      school_id: school.id, sender_id: user.id, recipient_id: active.user_id,
      body: body || "(attachment)", attachments: attachments as any,
    });
    if (error) toast.error(error.message);
  }

  const filtered = peers.filter(p => !filter || (p.profile?.full_name || p.profile?.email || "").toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="grid md:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-180px)] min-h-[500px]">
      <SectionCard title="Conversations" className={`flex-col ${active ? "hidden md:flex" : "flex"}`}>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input placeholder="Search" value={filter} onChange={e => setFilter(e.target.value)} className="pl-9" />
        </div>
        <div className="flex-1 overflow-y-auto -mx-2 px-2">
          {filtered.length === 0 ? <EmptyState icon={MessagesSquare} title="No people" /> :
            <ul className="space-y-1">{filtered.map(p => (
              <li key={p.user_id}>
                <button onClick={() => setActive(p)} className={`w-full flex items-center gap-2 p-2 rounded-lg text-left hover:bg-muted ${active?.user_id === p.user_id ? "bg-muted" : ""}`}>
                  <Avatar className="size-9">{p.profile?.photo_url && <AvatarImage src={p.profile.photo_url} />}<AvatarFallback className="text-xs">{(p.profile?.full_name || p.profile?.email || "?")[0].toUpperCase()}</AvatarFallback></Avatar>
                  <div className="min-w-0 flex-1"><div className="text-sm font-medium truncate">{p.profile?.full_name || p.profile?.email}</div><div className="text-[11px] text-muted-foreground capitalize">{p.role}</div></div>
                </button>
              </li>
            ))}</ul>}
        </div>
      </SectionCard>

      <SectionCard
        title={
          active ? (
            <span className="flex items-center gap-2">
              <button onClick={() => setActive(null)} className="md:hidden -ml-1 p-1 rounded-md hover:bg-muted" aria-label="Back">
                <ArrowLeft className="size-4" />
              </button>
              <span className="truncate">{active.profile?.full_name || active.profile?.email}</span>
            </span>
          ) : "Select a conversation"
        }
        className={`flex-col ${active ? "flex" : "hidden md:flex"}`}
      >
        {!active ? <EmptyState icon={MessagesSquare} title="Pick a conversation" desc="Choose someone on the left to start chatting." /> :
          <>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {thread.length === 0 ? <div className="text-sm text-muted-foreground text-center py-10">Say hi 👋</div> :
                thread.map(m => {
                  const mine = m.sender_id === user!.id;
                  const atts = (m.attachments as Attachment[]) ?? [];
                  return (
                    <div key={m.id} className={`max-w-[80%] ${mine ? "ml-auto" : ""} space-y-1.5`}>
                      {atts.map((a, i) => <AttachmentView key={i} a={a} mine={mine} />)}
                      {m.body && m.body !== "(attachment)" && (
                        <div className={`rounded-lg px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                          {m.body}
                          <div className="text-[10px] opacity-70 mt-0.5">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                        </div>
                      )}
                    </div>
                  );
                })}
              <div ref={endRef} />
            </div>
            <div className="-mx-4 -mb-4">
              <Composer
                bucket="message-attachments"
                userId={user!.id}
                prefix={`dm-${active.user_id}`}
                placeholder="Type a message…"
                transcribeVoice={false}
                onSubmit={sendComposer}
              />
            </div>
          </>}
      </SectionCard>
    </div>
  );
}