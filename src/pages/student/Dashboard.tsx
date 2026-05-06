import { useEffect, useState } from "react";
import { BookOpen, ListChecks, FileBarChart, ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { StatCard } from "@/components/dashboard/StatCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";

export default function StudentDashboard() {
  const { school, user } = useSchool();
  const [classes, setClasses] = useState(0);
  const [exams, setExams] = useState<any[]>([]);
  useEffect(() => {
    if (!school || !user) return;
    (async () => {
      const { count } = await supabase.from("class_enrollments").select("id", { count: "exact", head: true }).eq("student_id", user.id);
      setClasses(count ?? 0);
      const { data } = await supabase.from("exams").select("id,title,subject,scheduled_at,status").eq("school_id", school.id).in("status", ["scheduled","active"]).order("scheduled_at", { ascending: true }).limit(5);
      setExams(data ?? []);
    })();
  }, [school, user]);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Upcoming Exams" value={String(exams.length)} icon={ListChecks} tone="student" />
        <StatCard label="My Classes" value={String(classes)} icon={BookOpen} tone="info" />
        <StatCard label="Latest Score" value="—" icon={FileBarChart} tone="success" />
        <StatCard label="Attendance" value="—" icon={ClipboardCheck} tone="warning" />
      </div>
      <SectionCard title="Upcoming Exams">
        {exams.length === 0 ? <EmptyState icon={ListChecks} title="No upcoming exams" /> :
          <ul className="space-y-2">{exams.map(e => (
            <li key={e.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div><div className="font-medium">{e.title}</div><div className="text-xs text-muted-foreground">{e.subject || "—"}</div></div>
              <span className="text-xs text-muted-foreground">{e.scheduled_at ? new Date(e.scheduled_at).toLocaleDateString() : "TBD"}</span>
            </li>
          ))}</ul>}
      </SectionCard>
    </div>
  );
}
