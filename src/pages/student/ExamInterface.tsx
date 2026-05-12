import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ListChecks, AlertTriangle, Clock, Maximize2, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Deterministic shuffle seeded by attempt_id so order is stable per student
function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  const rand = () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return ((h >>> 0) % 100000) / 100000;
  };
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ExamInterface() {
  const { school, user } = useSchool();
  const [exams, setExams] = useState<any[]>([]);
  const [activeExam, setActiveExam] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState<number>(0);
  const [violations, setViolations] = useState<number>(0);
  const [violationLimit, setViolationLimit] = useState<number>(3);
  const submittingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const snapTimerRef = useRef<number | null>(null);
  const [proctorOn, setProctorOn] = useState(false);

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
      const { data: existing } = await supabase.from("exam_attempts").select("id,started_at,submitted_at").eq("exam_id", exam.id).eq("student_id", user.id).single();
      if (existing?.submitted_at) { toast.error("You have already submitted this exam."); return; }
      attempt = existing!;
    }
    setAttemptId(attempt.id);
    const { data: qs } = await supabase.from("exam_questions").select("*").eq("exam_id", exam.id).order("position");
    let list = qs ?? [];
    if (exam.randomize) list = seededShuffle(list, attempt.id);
    setQuestions(list);
    // Load any previously saved answers (resume)
    const { data: prior } = await supabase.from("exam_answers").select("question_id,selected_index").eq("attempt_id", attempt.id);
    const restored: Record<string, number> = {};
    (prior ?? []).forEach((r: any) => { if (r.selected_index !== null) restored[r.question_id] = r.selected_index; });
    setAnswers(restored);
    // Server-authoritative start time
    const { data: att } = await supabase.from("exam_attempts").select("started_at").eq("id", attempt.id).single();
    const start = att?.started_at ? new Date(att.started_at).getTime() : Date.now();
    setStartedAt(start);
    const dur = (exam.duration_min ?? exam.duration_minutes ?? 60) * 60;
    setRemaining(Math.max(0, Math.floor(start / 1000 + dur - Date.now() / 1000)));
    setViolationLimit(exam.violation_limit ?? 3);
    setViolations(0);
    setActiveExam(exam);
    // Request fullscreen
    setTimeout(() => {
      containerRef.current?.requestFullscreen?.().catch(() => {});
    }, 50);
    // Start proctoring if exam requires it
    if (exam.proctored) {
      startProctor(exam.id, attempt.id);
    }
  }

  async function startProctor(examId: string, attempt: string) {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => {}); }
      setProctorOn(true);
      const snap = async () => {
        try {
          const v = videoRef.current; if (!v || v.readyState < 2) return;
          const c = document.createElement("canvas");
          c.width = 320; c.height = 240;
          c.getContext("2d")!.drawImage(v, 0, 0, 320, 240);
          const blob: Blob | null = await new Promise(res => c.toBlob(res, "image/jpeg", 0.6));
          if (!blob) return;
          const path = `${examId}/${attempt}/${Date.now()}.jpg`;
          await supabase.storage.from("proctor-snapshots").upload(path, blob, { contentType: "image/jpeg", upsert: false });
        } catch {/* ignore */}
      };
      snap();
      snapTimerRef.current = window.setInterval(snap, 30_000);
    } catch (err: any) {
      toast.error("Webcam access denied — this exam requires proctoring.");
      logViolation("webcam_denied");
    }
  }

  function stopProctor() {
    if (snapTimerRef.current) { clearInterval(snapTimerRef.current); snapTimerRef.current = null; }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setProctorOn(false);
  }

  const submit = useCallback(async (reason?: string) => {
    if (!attemptId || !activeExam || submittingRef.current) return;
    submittingRef.current = true;
    const rows = Object.entries(answers).map(([question_id, selected_index]) => ({ attempt_id: attemptId, question_id, selected_index }));
    if (rows.length) await supabase.from("exam_answers").upsert(rows, { onConflict: "attempt_id,question_id" });
    let correct = 0;
    questions.forEach(q => { if (answers[q.id] === q.correct_index) correct += q.points; });
    const total = questions.reduce((s, q) => s + q.points, 0) || 1;
    const score = Math.round((correct / total) * 100);
    await supabase.from("exam_attempts").update({ submitted_at: new Date().toISOString(), score }).eq("id", attemptId);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    stopProctor();
    toast.success(`${reason ? reason + " — " : ""}Submitted! Score: ${score}%`);
    setActiveExam(null); setQuestions([]); setAnswers({}); setAttemptId(null); setStartedAt(null);
    submittingRef.current = false;
  }, [attemptId, activeExam, answers, questions]);

  // Autosave individual answer
  async function selectAnswer(questionId: string, idx: number) {
    setAnswers(prev => ({ ...prev, [questionId]: idx }));
    if (!attemptId) return;
    await supabase.from("exam_answers").upsert(
      { attempt_id: attemptId, question_id: questionId, selected_index: idx },
      { onConflict: "attempt_id,question_id" }
    );
  }

  // Log a violation, warn, auto-submit on limit
  const logViolation = useCallback(async (type: string, detail?: string) => {
    if (!attemptId || !school || !activeExam || submittingRef.current) return;
    await supabase.from("exam_violations").insert({ attempt_id: attemptId, school_id: school.id, type, detail: detail ?? null });
    setViolations(v => {
      const next = v + 1;
      if (next >= violationLimit) {
        submit(`Auto-submitted after ${next} violations`);
      } else {
        toast.warning(`Warning ${next}/${violationLimit}: ${type}. Further violations will auto-submit your exam.`);
      }
      return next;
    });
  }, [attemptId, school, activeExam, violationLimit, submit]);

  // Timer
  useEffect(() => {
    if (!activeExam || !startedAt) return;
    const dur = (activeExam.duration_min ?? activeExam.duration_minutes ?? 60) * 60;
    const id = setInterval(() => {
      const left = Math.max(0, Math.floor(startedAt / 1000 + dur - Date.now() / 1000));
      setRemaining(left);
      if (left <= 0) { clearInterval(id); submit("Time up"); }
    }, 1000);
    return () => clearInterval(id);
  }, [activeExam, startedAt, submit]);

  // Lockdown: blur, visibility, fullscreen exit, copy/paste, context menu, devtools shortcuts
  useEffect(() => {
    if (!activeExam) return;
    const onBlur = () => logViolation("window_blur");
    const onVisibility = () => { if (document.visibilityState === "hidden") logViolation("tab_hidden"); };
    const onFsChange = () => { if (!document.fullscreenElement) logViolation("fullscreen_exit"); };
    const onContext = (e: MouseEvent) => e.preventDefault();
    const onCopy = (e: ClipboardEvent) => { e.preventDefault(); logViolation("copy_attempt"); };
    const onPaste = (e: ClipboardEvent) => { e.preventDefault(); logViolation("paste_attempt"); };
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (k === "f12" || (e.ctrlKey && e.shiftKey && ["i","j","c"].includes(k)) || (e.ctrlKey && ["u","s","p"].includes(k))) {
        e.preventDefault(); logViolation("devtools_shortcut", k);
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [activeExam, logViolation]);

  const timerLabel = useMemo(() => {
    const m = Math.floor(remaining / 60).toString().padStart(2, "0");
    const s = (remaining % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }, [remaining]);

  if (activeExam) {
    return (
      <div ref={containerRef} className="bg-background min-h-screen select-none" style={{ userSelect: "none" }}>
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-semibold truncate">{activeExam.title}</div>
          <div className="flex items-center gap-3">
            {proctorOn && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="size-2 rounded-full bg-destructive animate-pulse" />
                <Video className="size-3.5" /> Proctoring
              </div>
            )}
            <div className={`flex items-center gap-1.5 text-sm font-mono px-2.5 py-1 rounded-md border ${remaining < 60 ? "border-destructive text-destructive" : "border-border"}`}>
              <Clock className="size-3.5" /> {timerLabel}
            </div>
            {violations > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertTriangle className="size-3.5" /> {violations}/{violationLimit}
              </div>
            )}
            <Button size="sm" variant="outline" onClick={() => containerRef.current?.requestFullscreen?.().catch(() => {})}>
              <Maximize2 className="size-3.5 mr-1" /> Fullscreen
            </Button>
            <Button size="sm" onClick={() => submit()}>Submit</Button>
          </div>
        </div>
        <video ref={videoRef} muted playsInline className="fixed bottom-3 right-3 w-32 h-24 rounded-md border border-border bg-black/60 z-20" style={{ display: proctorOn ? "block" : "none" }} />
        <div className="max-w-3xl mx-auto p-4">
          <SectionCard title={`Questions (${questions.length})`}>
            <ol className="space-y-5">
              {questions.map((q, i) => (
                <li key={q.id}>
                  <div className="font-medium">{i + 1}. {q.prompt}</div>
                  <div className="mt-2 space-y-1.5">
                    {(q.options as string[]).map((o, oi) => (
                      <label key={oi} className="flex items-center gap-2 p-2 rounded-md border border-border cursor-pointer hover:bg-secondary/40">
                        <input type="radio" name={q.id} checked={answers[q.id] === oi} onChange={() => selectAnswer(q.id, oi)} />
                        <span className="text-sm">{o}</span>
                      </label>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          </SectionCard>
        </div>
      </div>
    );
  }

  return (
    <SectionCard title="Available Exams">
      {exams.length === 0 ? <EmptyState icon={ListChecks} title="No exams available" /> :
        <ul className="space-y-2">{exams.map(e => (
          <li key={e.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
            <div>
              <div className="font-medium">{e.title}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span>{e.duration_min ?? e.duration_minutes} min</span>
                {e.randomize && <span className="px-1.5 py-0.5 rounded bg-secondary text-[10px]">Randomized</span>}
                {e.proctored && <span className="px-1.5 py-0.5 rounded bg-secondary text-[10px]">Proctored</span>}
              </div>
            </div>
            <Button onClick={() => start(e)}>Start</Button>
          </li>
        ))}</ul>}
    </SectionCard>
  );
}
