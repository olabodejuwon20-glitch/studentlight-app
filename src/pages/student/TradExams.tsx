import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, MapPin, ListChecks, Lock, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { schoolPath } from "@/lib/tenant";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/PageHeader";
import type { StudentPaperRow } from "@/lib/tradExams";

const STATUS_TONE: Record<string, string> = {
  upcoming: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  open: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  closed: "bg-muted text-muted-foreground",
};

export default function StudentTradExams() {
  const { school } = useSchool();
  const [rows, setRows] = useState<StudentPaperRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!school) return;
      const { data } = await supabase.rpc("trad_list_student_papers", { _school: school.id });
      setRows(((data as any) ?? []) as StudentPaperRow[]);
      setLoading(false);
    })();
  }, [school?.id]);

  return (
    <div className="space-y-6">
      <PageHeader title="School Examinations" description="Your scheduled exam papers and results." />
      <SectionCard title="My exam papers" description="Open during the scheduled window. Result appears once released by your school.">
        {loading ? <div className="text-sm text-muted-foreground">Loading…</div>
          : rows.length === 0 ? (
            <EmptyState icon={ListChecks} title="No exam papers yet"
              desc="Once your school publishes a paper for your class, it will appear here." />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {rows.map(p => {
                const completed = p.attempt_status === "graded" || p.attempt_status === "submitted";
                return (
                  <div key={p.exam_id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-display font-semibold truncate">{p.title}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {p.exam_type.toUpperCase()} · {p.total_marks} marks
                        </div>
                      </div>
                      <Badge variant="outline" className={STATUS_TONE[p.status]}>{p.status}</Badge>
                    </div>
                    <div className="mt-3 text-xs text-muted-foreground flex flex-wrap gap-3">
                      <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />
                        {p.exam_date} · {p.start_time?.slice(0, 5)} · {p.duration_minutes}min
                      </span>
                      {p.venue && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{p.venue}</span>}
                    </div>
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      {p.result_released ? (
                        <Button size="sm" variant="outline" asChild>
                          <Link to={schoolPath(school?.slug, `/app/student/trad-exams/result/${p.attempt_id}`)}>
                            <CheckCircle2 className="size-3.5 mr-1" />View result
                          </Link>
                        </Button>
                      ) : completed ? (
                        <Badge variant="secondary">Submitted · awaiting result</Badge>
                      ) : p.status === "open" ? (
                        <Button size="sm" asChild>
                          <Link to={schoolPath(school?.slug, `/app/student/trad-exams/run/${p.exam_id}`)}>
                            Start exam
                          </Link>
                        </Button>
                      ) : p.status === "upcoming" ? (
                        <Badge variant="outline">Opens at scheduled time</Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground">
                          <Lock className="size-3 mr-1" />Closed
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </SectionCard>
    </div>
  );
}