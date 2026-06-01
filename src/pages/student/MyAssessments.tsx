import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/EmptyState";
import { ClipboardCheck, Play, Eye, Award, Sparkles, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { schoolPath } from "@/lib/tenant";

type Row = {
  assessment_id: string; school_id: string; title: string; type: string;
  status: string; scheduled_at: string | null; opens_at: string | null; closes_at: string | null;
  attempt_id: string | null; attempt_status: string | null;
  percentage: number | null; grade: string | null;
};

const TYPE_META: Record<string, { label: string; icon: any }> = {
  school_test:  { label: "Test",       icon: ClipboardCheck },
  school_exam:  { label: "Exam",       icon: GraduationCap },
  jamb_mock:    { label: "JAMB Mock",  icon: Award },
  neco_mock:    { label: "NECO Mock",  icon: Award },
  waec_mock:    { label: "WAEC Mock",  icon: Award },
  ai_assessment:{ label: "AI",         icon: Sparkles },
};

export default function MyAssessments() {
  const { school } = useSchool();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    if (!school) return;
    setLoading(true);
    const { data } = await supabase
      .from("student_assessments_v" as any)
      .select("*")
      .eq("school_id", school.id)
      .order("scheduled_at", { ascending: false, nullsFirst: false });
    setRows((data as any) ?? []);
    setLoading(false);
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [school?.id]);

  async function start(assessmentId: string) {
    const { data, error } = await supabase.rpc("start_assessment", { _assessment_id: assessmentId });
    if (error) return toast.error(error.message);
    // The unified runner will be implemented in a later phase; for now redirect to review with attempt id.
    toast.success("Attempt started");
    refresh();
  }

  const upcoming = rows.filter(r => !r.attempt_id);
  const inProgress = rows.filter(r => r.attempt_status === "in_progress");
  const completed = rows.filter(r => r.attempt_status === "submitted");

  return (
    <div className="space-y-4">
      <SectionCard title={<span className="flex items-center gap-2"><Play className="size-4" /> Continue ({inProgress.length})</span>}>
        {!inProgress.length
          ? <p className="text-sm text-muted-foreground">No active attempts.</p>
          : <List rows={inProgress} action={(r) => (
              <Button size="sm" onClick={() => start(r.assessment_id)}><Play className="size-3.5 mr-1.5" /> Resume</Button>
            )} />}
      </SectionCard>

      <SectionCard title={<span className="flex items-center gap-2"><ClipboardCheck className="size-4" /> Available ({upcoming.length})</span>}>
        {loading ? <div className="py-6 text-sm text-muted-foreground text-center">Loading…</div>
          : !upcoming.length
            ? <EmptyState icon={ClipboardCheck} title="Nothing to take" desc="Your teachers have not published any new assessments." />
            : <List rows={upcoming} action={(r) => (
                <Button size="sm" onClick={() => start(r.assessment_id)}><Play className="size-3.5 mr-1.5" /> Start</Button>
              )} />}
      </SectionCard>

      <SectionCard title={<span className="flex items-center gap-2"><Award className="size-4" /> Completed ({completed.length})</span>}>
        {!completed.length
          ? <p className="text-sm text-muted-foreground">No completed assessments yet.</p>
          : <List rows={completed} action={(r) => (
              <Link to={schoolPath(school?.slug, `/app/student/review?attempt=${r.attempt_id}`)}>
                <Button size="sm" variant="outline"><Eye className="size-3.5 mr-1.5" /> Review</Button>
              </Link>
            )} />}
      </SectionCard>
    </div>
  );
}

function List({ rows, action }: { rows: Row[]; action: (r: Row) => React.ReactNode }) {
  return (
    <ul className="divide-y divide-border">
      {rows.map(r => {
        const meta = TYPE_META[r.type] ?? { label: r.type, icon: ClipboardCheck };
        const Icon = meta.icon;
        return (
          <li key={`${r.assessment_id}-${r.attempt_id ?? "new"}`} className="py-3 flex items-center gap-3">
            <div className="grid place-items-center size-9 rounded-lg bg-secondary/60">
              <Icon className="size-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-semibold text-sm truncate">{r.title}</div>
                <Badge variant="secondary" className="text-[10px]">{meta.label}</Badge>
                {r.percentage !== null && (
                  <Badge variant="outline" className="text-[10px]">
                    {Math.round(Number(r.percentage))}% · {r.grade ?? "-"}
                  </Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {r.scheduled_at ? new Date(r.scheduled_at).toLocaleString() : "Open assessment"}
              </div>
            </div>
            {action(r)}
          </li>
        );
      })}
    </ul>
  );
}