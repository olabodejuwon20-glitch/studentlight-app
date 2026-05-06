import { useEffect, useState } from "react";
import { Plus, Trash2, FilePlus2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";

interface Q { prompt: string; options: string[]; correct_index: number }

export default function TestBuilder() {
  const { school, user } = useSchool();
  const [classes, setClasses] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [classId, setClassId] = useState("");
  const [duration, setDuration] = useState(60);
  const [questions, setQuestions] = useState<Q[]>([{ prompt: "", options: ["", "", "", ""], correct_index: 0 }]);

  useEffect(() => {
    if (!school || !user) return;
    supabase.from("classes").select("*").eq("school_id", school.id).eq("teacher_id", user.id).then(({ data }) => setClasses(data ?? []));
  }, [school, user]);

  function update(i: number, patch: Partial<Q>) { setQuestions(qs => qs.map((q, idx) => idx === i ? { ...q, ...patch } : q)); }

  async function publish() {
    if (!school || !user) return;
    if (!title || !questions.length) return toast.error("Title and at least one question required");
    const { data: exam, error } = await supabase.from("exams").insert({
      school_id: school.id, class_id: classId || null, title, duration_minutes: duration,
      status: "scheduled", created_by: user.id,
    }).select("id").single();
    if (error) return toast.error(error.message);
    const rows = questions.map((q, i) => ({ exam_id: exam.id, school_id: school.id, position: i, prompt: q.prompt, options: q.options, correct_index: q.correct_index, points: 1 }));
    const { error: e2 } = await supabase.from("exam_questions").insert(rows);
    if (e2) return toast.error(e2.message);
    toast.success("Exam published");
    setTitle(""); setQuestions([{ prompt: "", options: ["", "", "", ""], correct_index: 0 }]);
  }

  return (
    <SectionCard title="Build a test" action={<Button onClick={publish}>Publish</Button>}>
      {!classes.length ? <EmptyState icon={FilePlus2} title="No classes" desc="Create a class first." /> :
      <div className="space-y-5">
        <div className="grid sm:grid-cols-3 gap-3">
          <div><Label>Title</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Mid-term exam" /></div>
          <div><Label>Class</Label>
            <Select value={classId} onValueChange={setClassId}><SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
              <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.code}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Duration (min)</Label><Input type="number" value={duration} onChange={e => setDuration(Number(e.target.value))} /></div>
        </div>
        <div className="space-y-4">
          {questions.map((q, i) => (
            <div key={i} className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Question {i + 1}</span>
                <Button variant="ghost" size="icon" onClick={() => setQuestions(qs => qs.filter((_, idx) => idx !== i))}><Trash2 className="size-4 text-destructive" /></Button>
              </div>
              <Textarea placeholder="Question text" value={q.prompt} onChange={e => update(i, { prompt: e.target.value })} />
              <div className="grid sm:grid-cols-2 gap-2">
                {q.options.map((o, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input type="radio" checked={q.correct_index === oi} onChange={() => update(i, { correct_index: oi })} />
                    <Input value={o} onChange={e => { const opts = [...q.options]; opts[oi] = e.target.value; update(i, { options: opts }); }} placeholder={`Option ${oi + 1}`} />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <Button variant="secondary" onClick={() => setQuestions(qs => [...qs, { prompt: "", options: ["","","",""], correct_index: 0 }])}><Plus className="size-4 mr-1.5" /> Add question</Button>
        </div>
      </div>}
    </SectionCard>
  );
}
