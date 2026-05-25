import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Award, CheckCircle2, Clock, GraduationCap, Loader2, LogOut, ShieldCheck, User as UserIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { schoolPath } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Subject = { id: string; code: string; name: string; color: string; sort: number };
type Question = { id: string; subject_id: string; position: number; prompt: string; options: any };
type AnswerMap = Record<string, { selected_index: number | null; marked: boolean }>;

function fmtClock(secs: number) {
  const s = Math.max(0, Math.floor(secs));
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

export default function MockRunner() {
  const { sessionId, slug } = useParams<{ sessionId: string; slug: string }>();
  const { school, user, displayName } = useSchool();
  const nav = useNavigate();
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(Date.now());
  const upsertQueue = useRef<Map<string, { selected_index: number | null; marked: boolean; subject_id: string }>>(new Map());

  const { data, isLoading } = useQuery({
    queryKey: ["mock-runner", sessionId],
    enabled: !!sessionId && !!school,
    queryFn: async () => {
      const { data: session, error } = await supabase.from("mock_sessions").select("*").eq("id", sessionId!).single();
      if (error) throw error;
      const { data: sessSubs, error: e2 } = await supabase
        .from("mock_session_subjects")
        .select("subject_id, sort")
        .eq("session_id", sessionId!)
        .order("sort");
      if (e2) throw e2;
      const subjectIds = sessSubs.map(s => s.subject_id);
      const [{ data: subjects }, qRes, { data: ans }] = await Promise.all([
        supabase.from("mock_subjects").select("id, code, name, color, sort").in("id", subjectIds),
        supabase.rpc("get_mock_questions_for_session", { _session_id: sessionId! }),
        supabase.from("mock_answers").select("question_id, subject_id, selected_index, marked_for_review").eq("session_id", sessionId!),
      ]);
      const questions = (qRes.data ?? []).map((r: any) => ({
        id: r.q_id, subject_id: r.q_subject_id, position: r.q_position,
        prompt: r.q_prompt, options: r.q_options,
      }));
      const orderedSubjects = (subjects ?? []).sort((a, b) => sessSubs.findIndex(x => x.subject_id === a.id) - sessSubs.findIndex(x => x.subject_id === b.id));
      return {
        session,
        subjects: orderedSubjects as Subject[],
        questions: questions as Question[],
        answers: ans ?? [],
      };
    },
  });

  // Seed answers + active subject when loaded
  useEffect(() => {
    if (!data) return;
    const init: AnswerMap = {};
    for (const a of data.answers) {
      init[a.question_id] = { selected_index: a.selected_index, marked: a.marked_for_review };
    }
    setAnswers(init);
    setActiveSubject(prev => prev ?? data.subjects[0]?.id ?? null);
  }, [data]);

  // Timer
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const session = data?.session;
  const subjects = data?.subjects ?? [];
  const allQuestions = data?.questions ?? [];

  const subjectQuestions = useMemo(
    () => allQuestions.filter(q => q.subject_id === activeSubject).sort((a, b) => a.position - b.position),
    [allQuestions, activeSubject],
  );
  const currentQ = subjectQuestions[activeIdx];

  const endsAt = session ? new Date(session.started_at).getTime() + session.duration_minutes * 60_000 : 0;
  const secondsLeft = Math.max(0, Math.floor((endsAt - now) / 1000));
  const isSubmitted = session?.status === "submitted";

  // Auto-submit on timeout
  useEffect(() => {
    if (session && !isSubmitted && secondsLeft === 0 && endsAt > 0) {
      submit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, isSubmitted]);

  // Debounced flush of answers
  useEffect(() => {
    const id = setInterval(async () => {
      if (!sessionId || upsertQueue.current.size === 0) return;
      const batch = Array.from(upsertQueue.current.entries()).map(([question_id, v]) => ({
        session_id: sessionId,
        question_id,
        subject_id: v.subject_id,
        selected_index: v.selected_index,
        marked_for_review: v.marked,
      }));
      upsertQueue.current.clear();
      await supabase.from("mock_answers").upsert(batch, { onConflict: "session_id,question_id" });
    }, 1200);
    return () => clearInterval(id);
  }, [sessionId]);

  function setAnswer(qId: string, subjectId: string, patch: Partial<{ selected_index: number | null; marked: boolean }>) {
    setAnswers(prev => {
      const cur = prev[qId] ?? { selected_index: null, marked: false };
      const next = { ...cur, ...patch };
      upsertQueue.current.set(qId, { selected_index: next.selected_index, marked: next.marked, subject_id: subjectId });
      return { ...prev, [qId]: next };
    });
  }

  async function submit(auto = false) {
    if (!session || isSubmitted) return;
    if (!auto && !confirm("Submit your mock? You won't be able to change your answers.")) return;
    setSubmitting(true);
    try {
      // Flush pending writes
      if (upsertQueue.current.size > 0) {
        const batch = Array.from(upsertQueue.current.entries()).map(([question_id, v]) => ({
          session_id: sessionId!, question_id, subject_id: v.subject_id,
          selected_index: v.selected_index, marked_for_review: v.marked,
        }));
        upsertQueue.current.clear();
        await supabase.from("mock_answers").upsert(batch, { onConflict: "session_id,question_id" });
      }
      const { data: graded, error: gErr } = await supabase.rpc("grade_mock_session", { _session_id: sessionId!, _auto: auto });
      if (gErr) throw gErr;
      const total = (graded as any)?.total_score ?? 0;
      const totalQ = (graded as any)?.total_questions ?? allQuestions.length;
      toast.success(auto ? "Time up — auto-submitted" : `Submitted. Score: ${total}/${totalQ}`);
      nav(schoolPath(slug, "/app/student/mock"));
    } catch (e: any) {
      toast.error(e.message ?? "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading || !data) {
    return <div className="min-h-[60vh] grid place-items-center text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>;
  }
  if (!session) {
    return <div className="p-8 text-center text-muted-foreground">Session not found.</div>;
  }

  const ModeIcon = session.mode === "neco_sim" ? Award : GraduationCap;
  const modeLabel = session.mode === "neco_sim" ? "NECO CBT Mock" : "JAMB CBT Mock";
  const activeSubjectMeta = subjects.find(s => s.id === activeSubject);
  const answeredInSubject = subjectQuestions.filter(q => answers[q.id]?.selected_index != null).length;
  const totalAnswered = allQuestions.filter(q => answers[q.id]?.selected_index != null).length;

  return (
    <div className="-m-4 sm:-m-6 lg:-m-8 min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-30 bg-card border-b border-border">
        <div className="grid grid-cols-[260px_1fr_320px] items-stretch">
          <div className="px-5 py-4 border-r border-border bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))]">
            <div className="flex items-center gap-2">
              <div className="size-9 grid place-items-center rounded-md bg-primary/20"><ShieldCheck className="size-4 text-primary" /></div>
              <div className="leading-tight">
                <div className="font-display font-bold text-base">{school?.name ?? "Legacyskool"}</div>
                <div className="text-[10px] opacity-80 uppercase tracking-wide">{modeLabel}</div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between px-6 py-3 gap-6">
            <div className="flex items-center gap-6 text-sm">
              <Pill icon={ModeIcon} label="Mode" value={modeLabel.replace(" CBT Mock", "")} />
              <Pill icon={UserIcon} label="Student" value={displayName ?? "—"} />
              <Pill icon={CheckCircle2} label="Progress" value={`${totalAnswered}/${allQuestions.length}`} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-4 px-5 border-l border-border">
            <div className="text-right">
              <div className="text-[10px] uppercase text-muted-foreground">Time Remaining</div>
              <div className={cn("font-mono text-2xl font-bold tabular-nums", secondsLeft < 300 ? "text-destructive" : "text-foreground")}>
                {fmtClock(secondsLeft)}
              </div>
            </div>
            <Button size="sm" onClick={() => submit(false)} disabled={submitting || isSubmitted}>
              <CheckCircle2 className="size-4 mr-1.5" /> Submit Exam
            </Button>
          </div>
        </div>

        {/* Subject tab strip — UTME style */}
        <div className="px-6 py-2 flex gap-1.5 overflow-x-auto border-t border-border bg-card/50">
          {subjects.map(s => {
            const on = s.id === activeSubject;
            return (
              <button key={s.id} type="button"
                onClick={() => { setActiveSubject(s.id); setActiveIdx(0); }}
                className={cn(
                  "px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap border transition-colors flex items-center gap-2",
                  on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:bg-secondary"
                )}
              >
                <span className="size-2 rounded-full" style={{ background: on ? "white" : s.color }} />
                {s.name}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_320px] gap-0 min-h-[calc(100vh-140px)]">
        {/* Left rail */}
        <aside className="hidden lg:flex flex-col bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] border-r border-border p-5 gap-5">
          <div className="rounded-lg bg-white/5 p-4">
            <div className="font-semibold text-sm">{modeLabel} 2025</div>
            <div className="text-xs opacity-80 mt-0.5">{activeSubjectMeta?.name ?? "—"}</div>
            <div className="mt-2 inline-flex px-2 py-1 rounded text-[10px] font-semibold bg-primary/20 text-primary">{session.mode === "neco_sim" ? "NECO CBT Mode" : "JAMB CBT Mode"}</div>
          </div>
          <div className="space-y-2 text-xs">
            <div className="uppercase tracking-wide opacity-70 text-[10px]">Exam details</div>
            <DetailRow label="Subjects" value={String(subjects.length)} />
            <DetailRow label="Total Questions" value={String(allQuestions.length)} />
            <DetailRow label="Duration" value={`${session.duration_minutes} min`} />
          </div>
          <div className="space-y-2 text-xs">
            <div className="uppercase tracking-wide opacity-70 text-[10px]">Legend</div>
            <LegendRow color="bg-background border" label="Not Answered" />
            <LegendRow color="bg-success" label="Answered" />
            <LegendRow color="bg-warning" label="Marked for Review" />
            <LegendRow color="bg-primary" label="Current Question" />
          </div>
          <div className="mt-auto">
            <Button variant="destructive" size="sm" className="w-full" onClick={() => submit(false)} disabled={submitting || isSubmitted}>
              <LogOut className="size-4 mr-1.5" /> End Exam
            </Button>
          </div>
        </aside>

        {/* Question area */}
        <main className="p-6">
          {currentQ ? (
            <div className="bg-card border border-border rounded-2xl p-6 max-w-3xl mx-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold">Question {activeIdx + 1} of {subjectQuestions.length}</span>
                  <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-medium">1 Mark</span>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={!!answers[currentQ.id]?.marked}
                    onCheckedChange={(v) => setAnswer(currentQ.id, currentQ.subject_id, { marked: !!v })}
                  />
                  Mark for Review
                </label>
              </div>
              <div className="text-base leading-relaxed mb-5">{currentQ.prompt}</div>
              <div className="space-y-2.5">
                {(currentQ.options as string[]).map((opt, oi) => {
                  const chosen = answers[currentQ.id]?.selected_index === oi;
                  return (
                    <button key={oi} type="button" disabled={isSubmitted}
                      onClick={() => setAnswer(currentQ.id, currentQ.subject_id, { selected_index: oi })}
                      className={cn(
                        "w-full text-left rounded-xl border px-4 py-3 transition-all flex items-center gap-3",
                        chosen ? "border-success bg-success/10" : "border-border hover:bg-secondary/40",
                      )}
                    >
                      <span className={cn("size-7 grid place-items-center rounded-full text-xs font-semibold border",
                        chosen ? "bg-success text-success-foreground border-success" : "bg-background border-border"
                      )}>{String.fromCharCode(65 + oi)}</span>
                      <span className="text-sm">{opt}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-6">
                <Button variant="outline" disabled={activeIdx === 0} onClick={() => setActiveIdx(i => Math.max(0, i - 1))}>← Previous</Button>
                {activeIdx < subjectQuestions.length - 1 ? (
                  <Button onClick={() => setActiveIdx(i => Math.min(subjectQuestions.length - 1, i + 1))}>Next →</Button>
                ) : (
                  <Button onClick={() => {
                    const i = subjects.findIndex(s => s.id === activeSubject);
                    const next = subjects[i + 1];
                    if (next) { setActiveSubject(next.id); setActiveIdx(0); }
                    else toast.info("That was the last subject. Review or submit.");
                  }}>Next Subject →</Button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground text-center py-10">No questions in this subject.</div>
          )}
        </main>

        {/* Right rail: navigator */}
        <aside className="hidden lg:flex flex-col p-5 border-l border-border bg-card gap-4">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-sm">Question Navigator</div>
            <span className="text-xs text-muted-foreground">{subjectQuestions.length}</span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {subjectQuestions.map((q, i) => {
              const a = answers[q.id];
              const isCurrent = i === activeIdx;
              const cls = isCurrent ? "bg-primary text-primary-foreground border-primary"
                : a?.marked ? "bg-warning text-warning-foreground border-warning"
                : a?.selected_index != null ? "bg-success text-success-foreground border-success"
                : "bg-background border-border";
              return (
                <button key={q.id} type="button" onClick={() => setActiveIdx(i)}
                  className={cn("size-9 rounded-md text-xs font-semibold border transition-all", cls)}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs">
              <span>Progress</span>
              <span className="text-success font-semibold">{answeredInSubject} / {subjectQuestions.length} Answered</span>
            </div>
            <div className="h-2 mt-1.5 rounded-full bg-secondary overflow-hidden">
              <div className="h-full bg-success transition-all" style={{ width: `${(answeredInSubject / Math.max(1, subjectQuestions.length)) * 100}%` }} />
            </div>
          </div>
          <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-primary"><Clock className="size-3.5" /> {session.mode === "neco_sim" ? "NECO" : "JAMB"} Time Guide</div>
            <div className="mt-1 text-muted-foreground">You have {session.duration_minutes} minutes total. Pace yourself — about {Math.round(session.duration_minutes / Math.max(1, allQuestions.length))} min per question.</div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Pill({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="size-8 rounded-md bg-secondary grid place-items-center"><Icon className="size-4 text-muted-foreground" /></div>
      <div className="leading-tight">
        <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
        <div className="text-sm font-semibold">{value}</div>
      </div>
    </div>
  );
}
function DetailRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between"><span className="opacity-80">{label}</span><span className="font-semibold">{value}</span></div>;
}
function LegendRow({ color, label }: { color: string; label: string }) {
  return <div className="flex items-center gap-2"><span className={cn("size-3 rounded", color)} />{label}</div>;
}
