import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Clock, ArrowLeft, ArrowRight, Send, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { schoolPath } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { signedUrlForAsset } from "@/lib/tradExams";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type Q = {
  q_id: string; q_position: number; q_type: "mcq" | "theory"; q_prompt: string;
  q_options: string[] | null; q_marks: number; q_image_path: string | null;
  q_section_id: string | null; q_selected_index: number | null; q_text_answer: string | null;
};

const LS = (id: string) => `trad:attempt:${id}`;

export default function StudentTradExamRunner() {
  const { examId } = useParams<{ examId: string }>();
  const { school } = useSchool();
  const nav = useNavigate();
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, { selected?: number | null; text?: string }>>({});
  const [current, setCurrent] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [done, setDone] = useState(false);
  const submittedRef = useRef(false);
  const shellRef = useRef<HTMLDivElement>(null);
  const startTsRef = useRef<number | null>(null);
  const durMinRef = useRef<number>(60);

  const submit = useCallback(async (reason?: string) => {
    if (!attemptId || submittedRef.current) return;
    submittedRef.current = true;
    setSubmitting(true);
    // Flush pending text answers
    const rows = Object.entries(answers).map(([qid, v]) => ({
      attempt_id: attemptId, question_id: qid,
      selected_index: v.selected ?? null, text_answer: v.text ?? null,
    }));
    if (rows.length) {
      const { data: sch } = await supabase.from("trad_exam_attempts" as any).select("school_id").eq("id", attemptId).maybeSingle();
      const schoolId = (sch as any)?.school_id;
      if (schoolId) {
        await supabase.from("trad_exam_answers" as any).upsert(
          rows.map(r => ({ ...r, school_id: schoolId })),
          { onConflict: "attempt_id,question_id" }
        );
      }
    }
    const { error } = await supabase.rpc("trad_submit_attempt", { _attempt_id: attemptId, _auto: !!reason });
    setSubmitting(false);
    if (error) {
      submittedRef.current = false;
      toast.error(error.message);
      return;
    }
    localStorage.removeItem(LS(attemptId));
    toast.success(reason ? `${reason} — submitted` : "Submitted");
    setDone(true);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, [attemptId, answers]);

  // Start attempt
  useEffect(() => {
    if (!examId || !school) return;
    (async () => {
      const { data, error } = await supabase.rpc("trad_start_attempt", { _exam_id: examId });
      if (error) { toast.error(error.message); nav(schoolPath(school.slug, "/app/student/trad-exams")); return; }
      const aId = data as unknown as string;
      setAttemptId(aId);
      const { data: qs } = await supabase.rpc("trad_get_attempt_questions", { _attempt_id: aId });
      const list = ((qs as any) ?? []) as Q[];
      setQuestions(list);
      const init: Record<string, any> = {};
      list.forEach(q => init[q.q_id] = { selected: q.q_selected_index ?? null, text: q.q_text_answer ?? "" });
      // local restore
      try {
        const raw = localStorage.getItem(LS(aId));
        if (raw) {
          const local = JSON.parse(raw);
          Object.assign(init, local.answers ?? {});
        }
      } catch {}
      setAnswers(init);
      // fetch timetable timing
      const { data: meta } = await supabase.from("trad_exams" as any)
        .select("timetable_id, trad_exam_timetable:timetable_id(exam_date,start_time,duration_minutes)")
        .eq("id", examId).maybeSingle();
      const t = (meta as any)?.trad_exam_timetable;
      if (t) {
        const start = new Date(`${t.exam_date}T${t.start_time}`).getTime();
        startTsRef.current = start;
        durMinRef.current = t.duration_minutes;
        setRemaining(Math.max(0, Math.floor((start + t.duration_minutes * 60_000 - Date.now()) / 1000)));
      }
      setTimeout(() => shellRef.current?.requestFullscreen?.().catch(() => {}), 50);
    })();
  }, [examId, school?.id]);

  // Timer
  useEffect(() => {
    if (!attemptId || done) return;
    const id = setInterval(() => {
      if (!startTsRef.current) return;
      const left = Math.max(0, Math.floor((startTsRef.current + durMinRef.current * 60_000 - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) { clearInterval(id); submit("Time up"); }
    }, 1000);
    return () => clearInterval(id);
  }, [attemptId, done, submit]);

  // Persist local
  useEffect(() => {
    if (!attemptId) return;
    try { localStorage.setItem(LS(attemptId), JSON.stringify({ answers, current, savedAt: Date.now() })); } catch {}
  }, [attemptId, answers, current]);

  // Lockdown lite: warn on blur/visibility
  useEffect(() => {
    if (!attemptId || done) return;
    const onBlur = () => toast.warning("You left the exam window.");
    const onCtx = (e: Event) => e.preventDefault();
    window.addEventListener("blur", onBlur);
    document.addEventListener("contextmenu", onCtx);
    document.addEventListener("copy", onCtx);
    document.addEventListener("paste", onCtx);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("contextmenu", onCtx);
      document.removeEventListener("copy", onCtx);
      document.removeEventListener("paste", onCtx);
    };
  }, [attemptId, done]);

  function setAnswer(qid: string, patch: { selected?: number | null; text?: string }) {
    setAnswers(prev => ({ ...prev, [qid]: { ...prev[qid], ...patch } }));
    // fire-and-forget persist
    if (!attemptId) return;
    (async () => {
      const { data: sch } = await supabase.from("trad_exam_attempts" as any).select("school_id").eq("id", attemptId).maybeSingle();
      const schoolId = (sch as any)?.school_id;
      if (!schoolId) return;
      await supabase.from("trad_exam_answers" as any).upsert({
        school_id: schoolId, attempt_id: attemptId, question_id: qid,
        selected_index: patch.selected !== undefined ? patch.selected : answers[qid]?.selected ?? null,
        text_answer: patch.text !== undefined ? patch.text : answers[qid]?.text ?? null,
      }, { onConflict: "attempt_id,question_id" });
    })();
  }

  const answered = useMemo(
    () => questions.filter(q => {
      const a = answers[q.q_id];
      return q.q_type === "mcq" ? a?.selected != null : !!(a?.text?.trim());
    }).length,
    [questions, answers]
  );
  const totalMarks = useMemo(() => questions.reduce((s, q) => s + q.q_marks, 0), [questions]);
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  if (done) {
    return (
      <div className="max-w-xl mx-auto mt-10 text-center space-y-4">
        <CheckCircle2 className="size-12 text-emerald-500 mx-auto" />
        <h1 className="text-2xl font-display font-bold">Submitted</h1>
        <p className="text-muted-foreground text-sm">
          Your paper has been submitted. Theory answers will be graded by your teacher, then released by the school.
        </p>
        <Button asChild><Link to={schoolPath(school?.slug, "/app/student/trad-exams")}>Back to exams</Link></Button>
      </div>
    );
  }

  if (!attemptId || questions.length === 0) {
    return <div className="text-sm text-muted-foreground">Preparing exam…</div>;
  }

  const q = questions[current];

  return (
    <div ref={shellRef} className="min-h-screen bg-background select-none">
      <div className="sticky top-0 z-10 bg-card border-b border-border px-4 py-3 flex items-center gap-3 flex-wrap">
        <Badge variant="outline"><ShieldCheck className="size-3 mr-1" />Proctored</Badge>
        <div className="font-display font-semibold">Question {current + 1} of {questions.length}</div>
        <Badge variant="secondary">{answered}/{questions.length} answered</Badge>
        <Badge variant="secondary">{totalMarks} total marks</Badge>
        <div className="ml-auto flex items-center gap-2">
          <Clock className={cn("size-4", remaining < 300 && "text-destructive animate-pulse")} />
          <span className={cn("font-mono font-semibold", remaining < 300 && "text-destructive")}>{mm}:{ss}</span>
          <Button size="sm" onClick={() => setConfirmOpen(true)} disabled={submitting}>
            <Send className="size-3.5 mr-1" />Submit
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Badge>{q.q_type === "mcq" ? "MCQ" : "Theory"}</Badge>
            <Badge variant="outline">{q.q_marks} marks</Badge>
          </div>
          <div className="text-base mb-4 whitespace-pre-wrap">{q.q_prompt}</div>
          {q.q_image_path && <DiagramImage path={q.q_image_path} />}

          {q.q_type === "mcq" ? (
            <div className="space-y-2">
              {(q.q_options ?? []).map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => setAnswer(q.q_id, { selected: idx })}
                  className={cn(
                    "w-full text-left p-3 rounded-lg border transition",
                    answers[q.q_id]?.selected === idx
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <span className="font-semibold mr-2">{String.fromCharCode(65 + idx)}.</span>
                  {opt}
                </button>
              ))}
            </div>
          ) : (
            <Textarea
              rows={8}
              value={answers[q.q_id]?.text ?? ""}
              onChange={e => setAnswer(q.q_id, { text: e.target.value })}
              placeholder="Write your answer here…"
            />
          )}
        </div>

        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setCurrent(c => Math.max(0, c - 1))} disabled={current === 0}>
            <ArrowLeft className="size-4 mr-1" />Previous
          </Button>
          {current < questions.length - 1 ? (
            <Button onClick={() => setCurrent(c => Math.min(questions.length - 1, c + 1))}>
              Next<ArrowRight className="size-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={() => setConfirmOpen(true)} disabled={submitting}>
              <Send className="size-4 mr-1" />Submit
            </Button>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-xs font-semibold uppercase text-muted-foreground mb-2">Question palette</div>
          <div className="grid grid-cols-10 gap-1.5">
            {questions.map((qq, i) => {
              const a = answers[qq.q_id];
              const filled = qq.q_type === "mcq" ? a?.selected != null : !!(a?.text?.trim());
              return (
                <button key={qq.q_id} onClick={() => setCurrent(i)}
                  className={cn(
                    "size-8 rounded text-xs font-semibold border transition",
                    i === current ? "ring-2 ring-primary" : "",
                    filled ? "bg-primary/15 border-primary/40 text-primary" : "bg-card border-border text-muted-foreground"
                  )}
                >{i + 1}</button>
              );
            })}
          </div>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit exam?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {answered} of {questions.length} questions. You cannot edit answers after submission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep going</AlertDialogCancel>
            <AlertDialogAction onClick={() => submit()}>
              {submitting ? "Submitting…" : "Submit final answers"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DiagramImage({ path }: { path: string }) {
  const [u, setU] = useState<string | null>(null);
  useEffect(() => { signedUrlForAsset(path).then(setU); }, [path]);
  if (!u) return null;
  return <img src={u} alt="Diagram" className="max-h-64 rounded-md border border-border my-3" />;
}