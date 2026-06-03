import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Award, GraduationCap, Loader2, Trophy, TrendingUp, Target, ArrowLeft, BookOpenCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { schoolPath } from "@/lib/tenant";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { AIMarkdown } from "@/components/ai/AIMarkdown";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function MockResult() {
  const { sessionId, slug } = useParams<{ sessionId: string; slug: string }>();
  const { school } = useSchool();
  const nav = useNavigate();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke("mock-result-summary", { body: { session_id: sessionId } });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        setSummary(data);
      } catch (e: any) {
        toast.error(e?.message || "Failed to load result");
      } finally { setLoading(false); }
    })();
  }, [sessionId]);

  if (loading) {
    return <div className="min-h-[60vh] grid place-items-center text-muted-foreground"><Loader2 className="size-6 animate-spin" /></div>;
  }
  if (!summary) {
    return <div className="p-8 text-center text-muted-foreground">No result available.</div>;
  }

  const ModeIcon = summary.mode === "jamb_sim" ? GraduationCap : Award;
  const modeLabel = summary.mode === "jamb_sim" ? "JAMB CBT Mock" : "NECO CBT Mock";
  const pct = summary.percentage as number;
  const band = pct >= 70 ? { tone: "text-success", ring: "ring-success/40", bg: "bg-success/10", verdict: "Excellent" }
    : pct >= 50 ? { tone: "text-primary", ring: "ring-primary/40", bg: "bg-primary/10", verdict: "Good effort" }
    : pct >= 40 ? { tone: "text-warning", ring: "ring-warning/40", bg: "bg-warning/10", verdict: "Keep pushing" }
    : { tone: "text-destructive", ring: "ring-destructive/40", bg: "bg-destructive/10", verdict: "More practice needed" };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <div className="absolute inset-0 -z-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--student)/0.18),transparent_60%),radial-gradient(ellipse_at_bottom_left,hsl(var(--primary)/0.14),transparent_55%)]" aria-hidden />
        <div className="relative p-5 sm:p-8">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/15 grid place-items-center"><ModeIcon className="size-5 text-primary" /></div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Mock Result</div>
                <h1 className="font-display font-bold text-lg sm:text-xl">{modeLabel}</h1>
              </div>
            </div>
            <Badge variant="secondary">Practice — does not affect school transcript</Badge>
          </div>

          <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-center">
            <div className={cn("relative size-32 sm:size-40 rounded-full ring-8 grid place-items-center", band.ring, band.bg)}>
              <div className="text-center">
                <div className={cn("font-display text-4xl sm:text-5xl font-bold leading-none", band.tone)}>{pct}%</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1 font-semibold">{band.verdict}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatTile icon={Trophy} label="Score" value={`${summary.total_score}/${summary.total_questions}`} />
              <StatTile icon={Target} label="Subjects" value={String(summary.per_subject.length)} />
              {summary.jamb_projection != null
                ? <StatTile icon={TrendingUp} label="Projected JAMB" value={`${summary.jamb_projection}/400`} />
                : <StatTile icon={TrendingUp} label="Avg / subject" value={`${Math.round(summary.per_subject.reduce((a: number, b: any) => a + b.percentage, 0) / Math.max(1, summary.per_subject.length))}%`} />}
            </div>
          </div>
        </div>
      </div>

      {/* Per-subject */}
      <SectionCard title="Subject breakdown" description="How you did in each paper">
        <div className="grid sm:grid-cols-2 gap-3">
          {summary.per_subject.map((s: any) => (
            <div key={s.id} className="rounded-xl border border-border p-4 bg-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="size-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                  <div className="font-semibold text-sm truncate">{s.name}</div>
                </div>
                <span className="tabular-nums text-sm font-bold">{s.score}/{s.total}</span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${s.percentage}%`, background: s.color }} />
              </div>
              <div className="text-[11px] text-muted-foreground mt-1.5">{s.percentage}% · {s.answered} answered</div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* AI summary */}
      <SectionCard title="AI coach analysis" description="Personalised feedback to guide your next study session">
        <div className="flex items-start gap-3">
          <div className="size-9 rounded-lg bg-student/15 grid place-items-center shrink-0">
            <Sparkles className="size-4 text-student" />
          </div>
          <div className="flex-1 min-w-0">
            <AIMarkdown content={summary.markdown} />
          </div>
        </div>
      </SectionCard>

      {/* Footer actions */}
      <div className="flex flex-col sm:flex-row gap-2 sm:justify-between">
        <Button variant="outline" onClick={() => nav(schoolPath(slug, "/app/student/mock"))}>
          <ArrowLeft className="size-4 mr-1.5" /> Back to mocks
        </Button>
        <Button onClick={() => nav(schoolPath(slug, `/app/student/review?session=${sessionId}`))}>
          <BookOpenCheck className="size-4 mr-1.5" /> Review every question with AI
        </Button>
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <Icon className="size-4 text-muted-foreground mb-1.5" />
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="font-display font-bold text-base sm:text-lg mt-0.5">{value}</div>
    </div>
  );
}