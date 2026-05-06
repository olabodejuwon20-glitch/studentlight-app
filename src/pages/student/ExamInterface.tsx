import { useEffect, useState } from "react";
import { ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function ExamInterface() {
  const { school, user } = useSchool();
  const [exams, setExams] = useState<any[]>([]);
  const [activeExam, setActiveExam] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);

  useEffect(() => {
    if (!school) return;
    supabase.from("exams").select("*").eq("school_id", school.id).in("status", ["scheduled","active"]).then(({ data }) => setExams(data ?? []));
  }, [school]);

  async function start(exam: any) {
    if (!user || !school) return;
    const { data: a, error } = await supabase.from("exam_attempts").insert({ exam_id: exam.id, school_id: school.id, student_id: user.id }).select("id").single();
    if (error && !error.message.includes("duplicate")) return toast.error(error.message);
    let attempt = a;
    if (!attempt) {
      const { data: existing } = await supabase.from("exam_attempts").select("id").eq("exam_id", exam.id).eq("student_id", user.id).single();
      attempt = existing!;
    }
    setAttemptId(attempt.id);
    const { data: qs } = await supabase.from("exam_questions").select("*").eq("exam_id", exam.id).order("position");
    setQuestions(qs ?? []); setActiveExam(exam);
  }

  async function submit() {
    if (!attemptId || !activeExam) return;
    const rows = Object.entries(answers).map(([question_id, selected_index]) => ({ attempt_id: attemptId, question_id, selected_index }));
    if (rows.length) await supabase.from("exam_answers").upsert(rows, { onConflict: "attempt_id,question_id" });
    let correct = 0;
    questions.forEach(q => { if (answers[q.id] === q.correct_index) correct += q.points; });
    const total = questions.reduce((s, q) => s + q.points, 0) || 1;
    const score = Math.round((correct / total) * 100);
    await supabase.from("exam_attempts").update({ submitted_at: new Date().toISOString(), score }).eq("id", attemptId);
    toast.success(`Submitted! Score: ${score}%`);
    setActiveExam(null); setQuestions([]); setAnswers({}); setAttemptId(null);
  }

  if (activeExam) {
    return (
      <SectionCard title={activeExam.title} action={<Button onClick={submit}>Submit</Button>}>
        <ol className="space-y-5">
          {questions.map((q, i) => (
            <li key={q.id}>
              <div className="font-medium">{i + 1}. {q.prompt}</div>
              <div className="mt-2 space-y-1.5">
                {(q.options as string[]).map((o, oi) => (
                  <label key={oi} className="flex items-center gap-2 p-2 rounded-md border border-border cursor-pointer hover:bg-secondary/40">
                    <input type="radio" name={q.id} checked={answers[q.id] === oi} onChange={() => setAnswers({ ...answers, [q.id]: oi })} />
                    <span className="text-sm">{o}</span>
                  </label>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Available Exams">
      {exams.length === 0 ? <EmptyState icon={ListChecks} title="No exams available" /> :
        <ul className="space-y-2">{exams.map(e => (
          <li key={e.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div><div className="font-medium">{e.title}</div><div className="text-xs text-muted-foreground">{e.duration_minutes} min</div></div>
            <Button onClick={() => start(e)}>Start</Button>
          </li>
        ))}</ul>}
    </SectionCard>
  );
}
