import { useEffect, useState } from "react";
import { FileBarChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
export default function StudentResults() {
  const { school, user } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!school || !user) return;
    supabase.from("results").select("*").eq("school_id", school.id).eq("student_id", user.id).then(({ data }) => setRows(data ?? []));
  }, [school, user]);
  return (
    <SectionCard title="My Results">
      {rows.length === 0 ? <EmptyState icon={FileBarChart} title="No results yet" /> :
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{rows.map(r => (
          <div key={r.id} className="rounded-xl border border-border p-5">
            <div className="text-sm text-muted-foreground">{r.subject}</div>
            <div className="text-3xl font-display font-bold mt-2">{r.score}%</div>
            <Badge className="mt-2 bg-success/10 text-success border-success/30" variant="outline">Grade {r.grade || "—"}</Badge>
          </div>
        ))}</div>}
    </SectionCard>
  );
}
