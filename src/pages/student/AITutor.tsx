import { useEffect, useRef, useState } from "react";
import { Send, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Msg { role: "user" | "assistant"; content: string }

export default function AITutor() {
  const { school } = useSchool();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!school) return;
    supabase.from("ai_chats").select("role,content").eq("school_id", school.id).order("created_at").limit(50)
      .then(({ data }) => setMessages((data ?? []).filter(m => m.role !== "system") as Msg[]));
  }, [school]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: 9e9 }); }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !school) return;
    const userMsg: Msg = { role: "user", content: input };
    setMessages(m => [...m, userMsg]); setInput(""); setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-tutor", { body: { messages: [...messages, userMsg], school_id: school.id } });
      if (error) throw error;
      setMessages(m => [...m, { role: "assistant", content: data.reply }]);
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally { setBusy(false); }
  }

  return (
    <div className="rounded-xl border border-border bg-card flex flex-col h-[calc(100vh-180px)]">
      <div className="p-4 border-b border-border flex items-center gap-2">
        <Sparkles className="size-5 text-primary" /><span className="font-semibold">AI Tutor</span>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && <div className="text-center text-sm text-muted-foreground py-12">Ask anything — I'll help you learn.</div>}
        {messages.map((m, i) => (
          <div key={i} className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-secondary"}`}>{m.content}</div>
        ))}
        {busy && <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="size-3 animate-spin" /> Thinking…</div>}
      </div>
      <form onSubmit={send} className="p-3 border-t border-border flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask a question..." disabled={busy} />
        <Button type="submit" size="icon" disabled={busy || !input.trim()}><Send className="size-4" /></Button>
      </form>
    </div>
  );
}
