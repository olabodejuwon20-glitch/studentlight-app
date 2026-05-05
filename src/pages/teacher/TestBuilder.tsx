import { useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { toast } from "sonner";

interface Q { question: string; options: string[]; correct: number; }

export default function TestBuilder() {
  const [meta, setMeta] = useState({ title: "Mid Term Test", subject: "Mathematics", duration: 60 });
  const [questions, setQuestions] = useState<Q[]>([{ question: "", options: ["", "", "", ""], correct: 0 }]);

  const update = (i: number, q: Partial<Q>) => setQuestions(qs => qs.map((x, idx) => idx === i ? { ...x, ...q } : x));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <SectionCard title="Test Details" className="lg:col-span-1 h-fit">
        <div className="space-y-3">
          <div><Label>Title</Label><Input value={meta.title} onChange={e => setMeta({...meta, title: e.target.value})} /></div>
          <div>
            <Label>Subject</Label>
            <Select value={meta.subject} onValueChange={v => setMeta({...meta, subject: v})}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Mathematics","English","Physics","Chemistry","Biology"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Duration (minutes)</Label><Input type="number" value={meta.duration} onChange={e => setMeta({...meta, duration: +e.target.value})} /></div>
          <Button className="w-full" onClick={() => toast.success("Test saved as draft")}><Save className="size-4 mr-2" /> Save Draft</Button>
          <Button variant="secondary" className="w-full" onClick={() => toast.success("Test published to students")}>Publish Test</Button>
        </div>
      </SectionCard>

      <SectionCard
        title="Questions"
        description={`${questions.length} questions`}
        className="lg:col-span-2"
        action={<Button size="sm" onClick={() => setQuestions(q => [...q, { question: "", options: ["", "", "", ""], correct: 0 }])}><Plus className="size-4 mr-1.5" /> Add Question</Button>}
      >
        <div className="space-y-5">
          {questions.map((q, i) => (
            <div key={i} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-muted-foreground">QUESTION {i+1}</div>
                <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => setQuestions(qs => qs.filter((_, idx) => idx !== i))}><Trash2 className="size-4" /></Button>
              </div>
              <Textarea placeholder="Type your question..." value={q.question} onChange={e => update(i, { question: e.target.value })} rows={2} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {q.options.map((opt, oi) => (
                  <label key={oi} className={`flex items-center gap-2 rounded-md border p-2 cursor-pointer ${q.correct === oi ? "border-success bg-success/5" : "border-border"}`}>
                    <input type="radio" name={`correct-${i}`} checked={q.correct === oi} onChange={() => update(i, { correct: oi })} className="accent-success" />
                    <Input value={opt} placeholder={`Option ${String.fromCharCode(65+oi)}`} onChange={e => update(i, { options: q.options.map((o, idx) => idx === oi ? e.target.value : o) })} className="border-0 bg-transparent focus-visible:ring-0 px-1" />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
