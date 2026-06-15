import { useEffect, useState } from "react";
import { PenLine, CheckCircle2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { schoolPath } from "@/lib/tenant";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Row = {
  id: string;
  text_answer: string | null;
  marks_awarded: number;
  graded_at: string | null;
  feedback: string | null;
  attempt: { student_id: string; status: string } | null;
  question: { prompt: string; marks: number; model_answer: string | null; exam_id: string } | null;
};

export default function TeacherTradExamGrading() {
  const { school, user } = useSchool();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, { marks: string; feedback: string }>>({});

  async function load() {
    if (!school || !user) return;
    setLoading(true);
    // Pull authored exams first to scope
    const { data: exams } = await supabase.from("trad_exams" as any)
      .select("id").eq("school_id", school.id).eq("author_id", user.id);
    const examIds = ((exams as any) ?? []).map((e: any) => e.id);
    if (examIds.length === 0) { setRows([]); setLoading(false); return; }
    const { data: qs } = await supabase.from("trad_exam_questions" as any)
      .select("id").eq("type", "theory").in("exam_id", examIds);
    const qIds = ((qs as any) ?? []).map((q: any) => q.id);
    if (qIds.length === 0) { setRows([]); setLoading(false); return; }
    const { data } = await supabase.from("trad_exam_answers" as any)
      .select("id, text_answer, marks_awarded, graded_at, feedback, attempt:trad_exam_attempts(student_id,status,submitted_at), question:trad_exam_questions(prompt,marks,model_answer,exam_id)")
      .in("question_id", qIds)
      .is("graded_at", null)
      .not("attempt.submitted_at", "is", null)
      .order("created_at", { ascending: false });
    setRows(((data as any) ?? []) as Row[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, [school?.id, user?.id]);

  async function grade(id: string, maxMarks: number) {
    const d = draft[id] ?? { marks: "0", feedback: "" };
    const m = Number(d.marks);
    if (isNaN(m) || m < 0 || m > maxMarks) return toast.error(`Marks must be 0–${maxMarks}`);
    const { error } = await supabase.rpc("trad_grade_theory", {
      _answer_id: id, _marks: m, _feedback: d.feedback || null,
    });
    if (error) return toast.error(error.message);
    toast.success("Graded");
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to={schoolPath(school?.slug, "/app/teacher/trad-exams")}><ArrowLeft className="size-4 mr-1" />Back</Link>
        </Button>
      </div>
      <SectionCard title="Theory grading queue"
        description="Grade theory answers from students who have submitted your papers.">
        {loading ? <div className="text-sm text-muted-foreground">Loading…</div>
          : rows.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="All caught up" desc="No theory answers waiting for your grade." />
          ) : (
            <div className="space-y-4">
              {rows.map(r => {
                const max = r.question?.marks ?? 0;
                const d = draft[r.id] ?? { marks: "0", feedback: "" };
                return (
                  <div key={r.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{max} marks</Badge>
                      <span className="text-xs text-muted-foreground">Student: {r.attempt?.student_id?.slice(0, 8)}…</span>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Question</div>
                      <div className="text-sm">{r.question?.prompt}</div>
                    </div>
                    {r.question?.model_answer && (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-muted-foreground">Model answer (private)</summary>
                        <div className="mt-1 p-2 bg-muted rounded">{r.question.model_answer}</div>
                      </details>
                    )}
                    <div>
                      <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Student answer</div>
                      <div className="text-sm whitespace-pre-wrap bg-muted/40 rounded p-3 border border-border">
                        {r.text_answer || <span className="text-muted-foreground italic">(no answer submitted)</span>}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr_auto] gap-2 items-end">
                      <div>
                        <Label>Marks (/{max})</Label>
                        <Input type="number" min={0} max={max} value={d.marks}
                          onChange={e => setDraft(p => ({ ...p, [r.id]: { ...d, marks: e.target.value } }))} />
                      </div>
                      <div>
                        <Label>Feedback (optional)</Label>
                        <Textarea rows={1} value={d.feedback}
                          onChange={e => setDraft(p => ({ ...p, [r.id]: { ...d, feedback: e.target.value } }))} />
                      </div>
                      <Button onClick={() => grade(r.id, max)}>
                        <PenLine className="size-3.5 mr-1" />Save grade
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </SectionCard>
    </div>
  );
}