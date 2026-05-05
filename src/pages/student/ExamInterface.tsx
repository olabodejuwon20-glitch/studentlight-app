import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { examQuestions } from "@/data/mock";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PAD = 30;
const TOTAL = examQuestions.length + PAD;
const all = [...examQuestions, ...Array.from({length: PAD}).map((_, i) => ({ q: `Question ${examQuestions.length + i + 1} placeholder`, options: ["A", "B", "C", "D"], correct: 0 }))];

export default function ExamInterface() {
  const [current, setCurrent] = useState(6); // question 7
  const [answers, setAnswers] = useState<Record<number, number>>({ 0: 0, 1: 1, 2: 2, 3: 0, 4: 1, 5: 2 });
  const [time, setTime] = useState(89 * 60 + 45);

  useEffect(() => { const t = setInterval(() => setTime(s => Math.max(0, s-1)), 1000); return () => clearInterval(t); }, []);
  const mm = String(Math.floor(time / 60)).padStart(2, "0");
  const ss = String(time % 60).padStart(2, "0");
  const hh = String(Math.floor(time / 3600)).padStart(2, "0");

  const q = all[current];
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <SectionCard title={`Exam Interface (CBT)`} className="lg:col-span-2"
        action={
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-[11px] text-muted-foreground">Time Left</div>
              <div className="font-display font-bold tabular-nums text-destructive flex items-center gap-1.5"><Clock className="size-4" />{hh}:{mm}:{ss}</div>
            </div>
            <Button onClick={() => toast.success("Exam submitted")}>Submit Exam</Button>
          </div>
        }>
        <div className="space-y-5">
          <div>
            <div className="text-xs font-medium text-muted-foreground">Question {current + 1} of {TOTAL}</div>
            <div className="mt-2 text-base sm:text-lg font-medium">{q.q}</div>
          </div>
          <div className="space-y-2">
            {q.options.map((opt, oi) => {
              const selected = answers[current] === oi;
              return (
                <label key={oi} className={cn("flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors", selected ? "border-student bg-student/5" : "border-border hover:bg-secondary/40")}>
                  <span className={cn("size-5 rounded-full border-2 grid place-items-center", selected ? "border-student" : "border-muted-foreground/40")}>
                    {selected && <span className="size-2 rounded-full bg-student" />}
                  </span>
                  <span className="text-sm">{String.fromCharCode(65 + oi)}. {opt}</span>
                </label>
              );
            })}
          </div>
          <div className="flex items-center justify-between pt-2">
            <Button variant="outline" disabled={current === 0} onClick={() => setCurrent(c => c - 1)}>Previous</Button>
            <Button onClick={() => setCurrent(c => Math.min(TOTAL - 1, c + 1))}>Next</Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Question Navigator" description="Jump to any question">
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: TOTAL }).map((_, i) => {
            const answered = answers[i] !== undefined;
            const isCur = i === current;
            return (
              <button key={i} onClick={() => setCurrent(i)}
                className={cn("aspect-square rounded-md text-xs font-semibold border transition-colors",
                  isCur ? "bg-student text-white border-student" :
                  answered ? "bg-success/10 text-success border-success/30" :
                  "bg-card text-muted-foreground border-border hover:bg-secondary")}>
                {i+1}
              </button>
            );
          })}
        </div>
        <div className="mt-5 space-y-2 text-xs">
          <div className="flex items-center gap-2"><span className="size-3 rounded-sm bg-success/20 border border-success/30" /> Answered</div>
          <div className="flex items-center gap-2"><span className="size-3 rounded-sm bg-student" /> Current</div>
          <div className="flex items-center gap-2"><span className="size-3 rounded-sm border border-border" /> Unanswered</div>
        </div>
      </SectionCard>
    </div>
  );
}
