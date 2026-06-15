import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, XCircle, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { schoolPath } from "@/lib/tenant";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Row = {
  id: string; attempt_id: string; student_id: string;
  percentage: number; grade: string | null; status: string;
  released_at: string | null;
  exam: { title: string } | null;
  student: { full_name: string | null; email: string | null } | null;
};

const TONE: Record<string, string> = {
  pending_validation: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  validated: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  rejected: "bg-red-500/15 text-red-700 dark:text-red-300",
};

export default function AdminTradExamResults() {
  const { school } = useSchool();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!school) return;
    setLoading(true);
    const { data } = await supabase.from("trad_exam_results" as any)
      .select("id, attempt_id, student_id, percentage, grade, status, released_at, exam:trad_exams(title), student:profiles(full_name,email)")
      .eq("school_id", school.id)
      .order("updated_at", { ascending: false });
    setRows(((data as any) ?? []) as Row[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, [school?.id]);

  async function act(attemptId: string, action: "validate" | "reject") {
    const { error } = await supabase.rpc("trad_validate_result", { _attempt_id: attemptId, _action: action });
    if (error) return toast.error(error.message);
    toast.success(action === "validate" ? "Result validated & released" : "Result rejected");
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to={schoolPath(school?.slug, "/app/admin/trad-exams")}><ArrowLeft className="size-4 mr-1" />Back</Link>
        </Button>
      </div>
      <SectionCard title="Result validation"
        description="Review graded results and release them to students.">
        {loading ? <div className="text-sm text-muted-foreground">Loading…</div>
          : rows.length === 0 ? (
            <EmptyState icon={Trophy} title="No results yet"
              desc="Once students submit and theory answers are graded, results appear here for validation." />
          ) : (
            <div className="space-y-2">
              {rows.map(r => (
                <div key={r.id} className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-semibold truncate">{r.exam?.title ?? "Paper"}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.student?.full_name ?? r.student?.email ?? r.student_id} · {Number(r.percentage).toFixed(1)}% · {r.grade ?? "-"}
                    </div>
                  </div>
                  <Badge variant="outline" className={TONE[r.status]}>{r.status.replace("_", " ")}</Badge>
                  {r.status === "pending_validation" && (
                    <>
                      <Button size="sm" onClick={() => act(r.attempt_id, "validate")}>
                        <CheckCircle2 className="size-3.5 mr-1" />Release
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive"
                        onClick={() => act(r.attempt_id, "reject")}>
                        <XCircle className="size-3.5 mr-1" />Reject
                      </Button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
      </SectionCard>
    </div>
  );
}