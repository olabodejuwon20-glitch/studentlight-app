import { useEffect, useRef, useState } from "react";
import { Send, MessagesSquare, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

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
    if (!text.trim() || !active || !user || !school) return;
    const body = text.trim();
    setText("");
    const { error } = await supabase.from("messages").insert({ school_id: school.id, sender_id: user.id, recipient_id: active.user_id, body });
    if (error) { toast.error(error.message); setText(body); }
  }

  const filtered = peers.filter(p => !filter || (p.profile?.full_name || p.profile?.email || "").toLowerCase().includes(filter.toLowerCase()));

  return (
    <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-180px)] min-h-[500px]">
      <SectionCard title="Conversations" className="flex flex-col">
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

      <SectionCard title={active ? (active.profile?.full_name || active.profile?.email) : "Select a conversation"} className="flex flex-col">
        {!active ? <EmptyState icon={MessagesSquare} title="Pick a conversation" desc="Choose someone on the left to start chatting." /> :
          <>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {thread.length === 0 ? <div className="text-sm text-muted-foreground text-center py-10">Say hi 👋</div> :
                thread.map(m => (
                  <div key={m.id} className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.sender_id === user!.id ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {m.body}
                    <div className="text-[10px] opacity-70 mt-0.5">{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                ))}
              <div ref={endRef} />
            </div>
            <div className="mt-3 flex gap-2">
              <Input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder="Type a message…" />
              <Button onClick={send}><Send className="size-4" /></Button>
            </div>
          </>}
      </SectionCard>
    </div>
  );
}