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
    supabase.from("results").select("*").eq("school_id", school.id).eq("student_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setRows(data ?? []));
  }, [school, user]);

  const overall = rows.length ? Math.round(rows.reduce((s,r)=>s+Number(r.score),0)/rows.length) : 0;

  return (
    <div className="space-y-6">
      <SectionCard title="Overall average" description="Across all subjects and terms">
        <div className="text-3xl font-display font-bold">{overall ? `${overall}%` : "—"}</div>
      </SectionCard>
      <SectionCard title="My results">
        {rows.length === 0 ? <EmptyState icon={FileBarChart} title="No results yet" /> :
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{rows.map(r => (
            <div key={r.id} className="rounded-xl border border-border p-5 bg-card">
              <div className="flex items-center justify-between"><div className="text-sm text-muted-foreground">{r.subject}</div><Badge variant="outline" className="bg-success/10 text-success border-success/30">{r.grade || "—"}</Badge></div>
              <div className="text-3xl font-display font-bold mt-2">{Math.round(Number(r.score))}%</div>
              <div className="text-xs text-muted-foreground mt-1">{r.term}</div>
              {r.remarks && <div className="text-xs mt-2 italic text-muted-foreground">"{r.remarks}"</div>}
            </div>
          ))}</div>}
      </SectionCard>
    </div>
  );
}
