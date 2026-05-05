import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/dashboard/SectionCard";

interface Msg { role: "user" | "ai"; text: string; }

export default function AITutor() {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "user", text: "Can you explain photosynthesis?" },
    { role: "ai", text: "Photosynthesis is the process used by plants to convert light energy into chemical energy. Plants use sunlight, water, and carbon dioxide to produce glucose and oxygen. The chemical equation: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂." },
  ]);
  const [input, setInput] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo(0, ref.current.scrollHeight); }, [messages]);

  const send = () => {
    if (!input.trim()) return;
    const text = input;
    setMessages(m => [...m, { role: "user", text }]);
    setInput("");
    setTimeout(() => setMessages(m => [...m, { role: "ai", text: "Great question! Here's a clear explanation: " + text + " — this is a common topic. Let me break it down for you step by step in your textbook chapter." }]), 600);
  };

  return (
    <SectionCard title="AI Tutor" description="Ask anything about your lessons"
      action={<Button size="sm" variant="secondary"><Plus className="size-4 mr-1.5" /> New Chat</Button>}>
      <div ref={ref} className="h-[440px] overflow-y-auto pr-2 scrollbar-thin space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex gap-3"}>
            {m.role === "ai" && (
              <div className="size-8 rounded-lg bg-student/10 text-student grid place-items-center shrink-0"><Sparkles className="size-4" /></div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-secondary text-secondary-foreground rounded-bl-sm"}`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={e => { e.preventDefault(); send(); }} className="mt-4 flex items-center gap-2 border-t border-border pt-4">
        <Input placeholder="Type your question..." value={input} onChange={e => setInput(e.target.value)} className="flex-1" />
        <Button type="submit" size="icon"><Send className="size-4" /></Button>
      </form>
    </SectionCard>
  );
}
