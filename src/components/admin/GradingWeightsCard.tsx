import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Weights = { ca_pct: number; assignment_pct: number; exam_pct: number; report_pct: number; passing_pct: number };
const DEFAULTS: Weights = { ca_pct: 30, assignment_pct: 10, exam_pct: 60, report_pct: 0, passing_pct: 50 };

export function GradingWeightsCard() {
  const { school } = useSchool();
  const [w, setW] = useState<Weights>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!school) return;
    setLoading(true);
    (supabase as any).from("term_grade_weights").select("*").eq("school_id", school.id).maybeSingle().then(({ data }: any) => {
      if (data) setW({
        ca_pct: Number(data.ca_pct), assignment_pct: Number(data.assignment_pct),
        exam_pct: Number(data.exam_pct), report_pct: Number(data.report_pct),
        passing_pct: Number(data.passing_pct ?? 50),
      });
      setLoading(false);
    });
  }, [school]);

  const sum = Math.round(w.ca_pct + w.assignment_pct + w.exam_pct + w.report_pct);
  const ok = sum === 100;

  async function save() {
    if (!school) return;
    if (!ok) { toast.error(`Weights must total 100 (current ${sum})`); return; }
    setSaving(true);
    const { error } = await (supabase as any).from("term_grade_weights").upsert({ school_id: school.id, ...w }, { onConflict: "school_id" });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Grading weights saved");
  }

  return (
    <SectionCard
      title="End-of-term grading weights"
      description="How CA tests, assignments, exams and the teacher report combine into each subject's term result. Must total 100%."
    >
      {loading ? <div className="text-sm text-muted-foreground">Loading…</div> : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="CA / Tests" value={w.ca_pct} onChange={(v) => setW({ ...w, ca_pct: v })} hint="From the Gradebook" />
            <Field label="Assignments" value={w.assignment_pct} onChange={(v) => setW({ ...w, assignment_pct: v })} hint="Graded submissions" />
            <Field label="Exams" value={w.exam_pct} onChange={(v) => setW({ ...w, exam_pct: v })} hint="Latest counted exam" />
            <Field label="Report rubric" value={w.report_pct} onChange={(v) => setW({ ...w, report_pct: v })} hint="Teacher score (optional)" />
          </div>
          <div className={`flex items-center gap-3 rounded-md border px-3 py-2 text-xs ${ok ? "border-success/40 bg-success/5 text-success" : "border-destructive/40 bg-destructive/5 text-destructive"}`}>
            <span className="font-semibold">Total: {sum}%</span>
            <span className="opacity-80">{ok ? "Looks good — these weights will be used the next time results are recomputed." : "Adjust values so they add to 100."}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">Passing %</Label>
              <Input type="number" min={0} max={100} value={w.passing_pct}
                onChange={e => setW({ ...w, passing_pct: Number(e.target.value) })} />
            </div>
          </div>
          <div className="flex justify-end"><Button onClick={save} disabled={saving || !ok}>{saving ? "Saving…" : "Save weights"}</Button></div>
        </div>
      )}
    </SectionCard>
  );
}

function Field({ label, value, onChange, hint }: { label: string; value: number; onChange: (n: number) => void; hint?: string }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <Input type="number" min={0} max={100} value={value} onChange={e => onChange(Number(e.target.value))} className="pr-8" />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
      </div>
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}