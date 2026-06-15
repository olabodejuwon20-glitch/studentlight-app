import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, XCircle, Rocket, FileText, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { schoolPath } from "@/lib/tenant";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { TradExam } from "@/lib/tradExams";
import { DRAFT_STATUS_TONE, formatStatus } from "@/lib/tradExams";

export default function AdminTradExamApprovals() {
  const { school } = useSchool();
  const [rows, setRows] = useState<TradExam[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!school) return;
    setLoading(true);
    const { data } = await supabase.from("trad_exams" as any)
      .select("*").eq("school_id", school.id)
      .in("draft_status", ["submitted", "approved"])
      .order("updated_at", { ascending: false });
    setRows(((data as any) ?? []) as TradExam[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, [school?.id]);

  async function act(examId: string, action: "approve" | "publish" | "reject") {
    let reason: string | null = null;
    if (action === "reject") {
      reason = window.prompt("Reason for sending back to the teacher?") || null;
      if (!reason) return;
    }
    const { error } = await supabase.rpc("trad_review_paper", {
      _exam_id: examId, _action: action, _reason: reason,
    });
    if (error) return toast.error(error.message);
    toast.success(action === "publish" ? "Paper published" : action === "approve" ? "Paper approved" : "Sent back to teacher");
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to={schoolPath(school?.slug, "/app/admin/trad-exams")}><ArrowLeft className="size-4 mr-1" />Back</Link>
        </Button>
      </div>
      <SectionCard title="Paper approval queue"
        description="Review submitted papers, approve them, and publish so students can sit the exam at its scheduled time.">
        {loading ? <div className="text-sm text-muted-foreground">Loading…</div>
          : rows.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Nothing to review"
              desc="When teachers submit papers for approval they will appear here." />
          ) : (
            <div className="space-y-2">
              {rows.map(e => (
                <div key={e.id} className="rounded-xl border border-border bg-card p-4 flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-semibold truncate">{e.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {e.exam_type?.toUpperCase()} · {e.total_marks} marks
                    </div>
                  </div>
                  <Badge variant="outline" className={DRAFT_STATUS_TONE[e.draft_status]}>
                    {formatStatus(e.draft_status)}
                  </Badge>
                  <Button size="sm" variant="outline" asChild>
                    <Link to={schoolPath(school?.slug, `/app/admin/trad-exams/paper/${e.id}`)}>
                      <FileText className="size-3.5 mr-1" />Open
                    </Link>
                  </Button>
                  {e.draft_status === "submitted" && (
                    <Button size="sm" onClick={() => act(e.id, "approve")}>
                      <CheckCircle2 className="size-3.5 mr-1" />Approve
                    </Button>
                  )}
                  {e.draft_status === "approved" && (
                    <Button size="sm" onClick={() => act(e.id, "publish")}>
                      <Rocket className="size-3.5 mr-1" />Publish
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive"
                    onClick={() => act(e.id, "reject")}>
                    <XCircle className="size-3.5 mr-1" />Reject
                  </Button>
                </div>
              ))}
            </div>
          )}
      </SectionCard>
    </div>
  );
}