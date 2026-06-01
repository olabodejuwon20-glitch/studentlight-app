import { useEffect, useState } from "react";
import { Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Row = {
  id: string;
  attempt_id: string;
  question_id: string;
  selected: any;
  points_awarded: number | null;
  ai_grade: number | null;
  ai_feedback: any;
  question?: { prompt: string; points: number; subject_code?: string | null };
  student_name?: string;
};

export default function AIMarking() {
  const { school, user } = useSchool();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!school || !user) return;
    (async () => {
      setLoading(true);
      // Essay/short answers needing teacher attention: ai_grade not yet confirmed onto points_awarded
      const { data: qs } = await supabase
        .from("questions_v2")
        .select("id, prompt, points, subject_code, type, assessment_id")
        .eq("school_id", school.id)
        .in("type", ["essay", "short"]);
      const qIds = (qs ?? []).map(q => q.id);
      if (!qIds.length) { setRows([]); setLoading(false); return; }
      const qMap = Object.fromEntries((qs ?? []).map(q => [q.id, q]));

      const { data: ans } = await supabase
        .from("assessment_answers_v2")
        .select("id, attempt_id, question_id, selected, points_awarded, ai_grade, ai_feedback")
        .in("question_id", qIds)
        .order("created_at", { ascending: false })
        .limit(100);

      const attemptIds = Array.from(new Set((ans ?? []).map(a => a.attempt_id)));
      const { data: attempts } = attemptIds.length
        ? await supabase.from("assessment_attempts_v2").select("id, student_id").in("id", attemptIds)
        : { data: [] as any[] };
      const studentIds = Array.from(new Set((attempts ?? []).map((a: any) => a.student_id)));
      const { data: profs } = studentIds.length
        ? await supabase.from("profiles").select("id, full_name, email").in("id", studentIds)
        : { data: [] as any[] };
      const attemptToStudent: Record<string, string> = {};
      (attempts ?? []).forEach((a: any) => { attemptToStudent[a.id] = a.student_id; });
      const pMap: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { pMap[p.id] = p.full_name || p.email || p.id.slice(0, 8); });

      setRows((ans ?? []).map(a => ({
        ...a,
        question: qMap[a.question_id] as any,
        student_name: pMap[attemptToStudent[a.attempt_id]] || "Student",
      })));
      setLoading(false);
    })();
  }, [school, user]);

  async function runAI(row: Row) {
    if (!school) return;
    setBusy(row.id);
    try {
      const answerText = typeof row.selected === "string"
        ? row.selected
        : row.selected?.text ?? JSON.stringify(row.selected ?? "");
      const { data, error } = await supabase.functions.invoke("mark-essay", {
        body: {
          school_id: school.id,
          answer_id: row.id,
          question: row.question?.prompt ?? "",
          student_answer: answerText,
          max_points: row.question?.points ?? 100,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const res = (data as any).result;
      setRows(rs => rs.map(r => r.id === row.id
        ? { ...r, ai_grade: res.overall_score, ai_feedback: res }
        : r));
      toast.success("AI suggestion ready");
    } catch (e: any) {
      toast.error(e?.message ?? "AI marking failed");
    } finally {
      setBusy(null);
    }
  }

  async function confirm(row: Row) {
    const raw = overrides[row.id] ?? String(row.ai_grade ?? "");
    const n = Number(raw);
    if (Number.isNaN(n)) return toast.error("Enter a number");
    const { error } = await supabase
      .from("assessment_answers_v2")
      .update({ points_awarded: n, is_correct: n >= (row.question?.points ?? 100) * 0.5 })
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    setRows(rs => rs.map(r => r.id === row.id ? { ...r, points_awarded: n } : r));
    toast.success("Score saved");
  }

  return (
    <SectionCard
      title="AI Marking Assistant"
      description="Generate per-criterion grades for essay & short-answer responses. Teacher always confirms the final score."
    >
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Sparkles} title="Nothing to mark" desc="Essay/short-answer submissions will appear here." />
      ) : (
        <ul className="space-y-4">
          {rows.map(r => {
            const answerText = typeof r.selected === "string" ? r.selected : r.selected?.text ?? "";
            return (
              <li key={r.id} className="rounded-lg border border-border p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">{r.student_name}{r.question?.subject_code ? ` · ${r.question.subject_code}` : ""}</div>
                    <div className="font-medium text-sm">{r.question?.prompt}</div>
                  </div>
                  <Badge variant="secondary" className="text-[10px] shrink-0">
                    {r.points_awarded != null ? `Saved ${r.points_awarded}/${r.question?.points}` : `${r.question?.points} pts`}
                  </Badge>
                </div>

                <div className="rounded-md bg-muted/50 p-3 text-sm whitespace-pre-wrap">
                  {answerText || <span className="text-muted-foreground italic">No text answer</span>}
                </div>

                {r.ai_feedback && (
                  <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-primary">
                      <Sparkles className="w-3.5 h-3.5" /> AI suggestion: {Number(r.ai_grade).toFixed(1)} / {r.question?.points}
                    </div>
                    {Array.isArray(r.ai_feedback.per_criterion) && (
                      <ul className="text-xs space-y-1">
                        {r.ai_feedback.per_criterion.map((c: any, i: number) => (
                          <li key={i}><span className="font-medium">{c.name}:</span> {Math.round((Number(c.score) || 0) * 100)}% — {c.comment}</li>
                        ))}
                      </ul>
                    )}
                    {r.ai_feedback.strengths && <div className="text-xs"><span className="font-medium">Strengths:</span> {r.ai_feedback.strengths}</div>}
                    {r.ai_feedback.improvements && <div className="text-xs"><span className="font-medium">Improve:</span> {r.ai_feedback.improvements}</div>}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" disabled={busy === r.id || !answerText} onClick={() => runAI(r)}>
                    {busy === r.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                    {r.ai_feedback ? "Re-run AI" : "Suggest grade"}
                  </Button>
                  <Input
                    className="w-24 h-8"
                    placeholder="Score"
                    defaultValue={r.ai_grade ?? r.points_awarded ?? ""}
                    onChange={e => setOverrides(o => ({ ...o, [r.id]: e.target.value }))}
                  />
                  <span className="text-xs text-muted-foreground">/ {r.question?.points}</span>
                  <Button size="sm" onClick={() => confirm(r)}>
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Confirm
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}