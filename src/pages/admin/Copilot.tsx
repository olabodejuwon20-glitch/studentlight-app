import { useRef, useState } from "react";
import { Sparkles, Send, Loader2, Wrench } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string; trace?: any[] };

const SUGGESTIONS = [
  "Which students are at risk this term?",
  "What's our fee collection rate this term?",
  "Show me the weakest 5 topics across all classes",
  "Which teachers haven't published results in the last 30 days?",
  "Compare class averages",
];

export default function Copilot() {
  const { school } = useSchool();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || !school || busy) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("principal-copilot", {
        body: {
          school_id: school.id,
          message: content,
          history: messages.map(m => ({ role: m.role, content: m.content })),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setMessages([...next, { role: "assistant", content: data.reply, trace: data.tool_trace ?? [] }]);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 1e9, behavior: "smooth" }));
    } catch (e: any) {
      toast.error(e?.message ?? "Copilot failed");
      setMessages(next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SectionCard
      title="Principal Copilot"
      description="Ask anything about your school — attendance, fees, results, weak topics, approvals."
      action={<Badge variant="secondary" className="gap-1"><Sparkles className="size-3" /> Run as Principal</Badge>}
    >
      <div ref={scrollRef} className="h-[55vh] overflow-y-auto rounded-lg border border-border bg-muted/20 p-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Try one of these:</p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-accent transition"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
              m.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-background border border-border"
            }`}>
              {m.role === "assistant" ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
              ) : m.content}
              {m.role === "assistant" && m.trace && m.trace.length > 0 && (
                <details className="mt-2 text-xs text-muted-foreground">
                  <summary className="cursor-pointer flex items-center gap-1">
                    <Wrench className="size-3" /> Tools used ({m.trace.length})
                  </summary>
                  <ul className="mt-1 space-y-1">
                    {m.trace.map((t, j) => (
                      <li key={j}><code className="text-[10px]">{t.tool}</code></li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Thinking…
          </div>
        )}
      </div>
      <div className="mt-3 flex gap-2">
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Ask your school anything…"
          className="min-h-[60px] resize-none"
          disabled={busy}
        />
        <Button onClick={() => send()} disabled={busy || !input.trim()} className="self-end">
          <Send className="size-4" />
        </Button>
      </div>
    </SectionCard>
  );
}