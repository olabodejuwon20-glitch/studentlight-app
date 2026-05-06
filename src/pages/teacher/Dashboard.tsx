import { useEffect, useState } from "react";
import { BookOpen, Users, ClipboardCheck, FileBarChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { StatCard } from "@/components/dashboard/StatCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";

export default function TeacherDashboard() {
  const { school, user } = useSchool();
  const [classes, setClasses] = useState<any[]>([]);
  const [examCount, setExamCount] = useState(0);
  useEffect(() => {
    if (!school || !user) return;
    (async () => {
      const { data } = await supabase.from("classes").select("*").eq("school_id", school.id).eq("teacher_id", user.id);
      setClasses(data ?? []);
      const { count } = await supabase.from("exams").select("id", { count: "exact", head: true }).eq("school_id", school.id).eq("created_by", user.id);
      setExamCount(count ?? 0);
    })();
  }, [school, user]);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="My Classes" value={String(classes.length)} icon={BookOpen} tone="teacher" />
        <StatCard label="Exams Created" value={String(examCount)} icon={ClipboardCheck} tone="info" />
        <StatCard label="Students" value="—" icon={Users} tone="success" />
        <StatCard label="Reports" value="—" icon={FileBarChart} tone="warning" />
      </div>
      <SectionCard title="My Classes">
        {classes.length === 0
          ? <EmptyState icon={BookOpen} title="No classes assigned" desc="Ask your admin to assign classes to you." />
          : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {classes.map(c => (
                <div key={c.id} className="rounded-xl border border-border p-4">
                  <div className="font-semibold">{c.code}</div>
                  <div className="text-sm">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.subject}</div>
                </div>
              ))}
            </div>}
      </SectionCard>
    </div>
  );
}
