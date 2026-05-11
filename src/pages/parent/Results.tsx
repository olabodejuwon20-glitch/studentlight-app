import { useEffect, useState } from "react";
import { FileBarChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";

export default function ParentResults() {
  const { school, user } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  const [kids, setKids] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!school || !user) return;
    (async () => {
      const { data: links } = await supabase.from("parent_links").select("student_user_id").eq("school_id", school.id).eq("parent_user_id", user.id);
      const ids = (links ?? []).map(l => l.student_user_id);
      if (!ids.length) return;
      const [{ data: profs }, { data: rs }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email").in("id", ids),
        supabase.from("results").select("*").eq("school_id", school.id).in("student_id", ids).order("created_at", { ascending: false }),
      ]);
      setKids(Object.fromEntries((profs ?? []).map(p => [p.id, p.full_name || p.email || "?"])));
      setRows(rs ?? []);
    })();
  }, [school, user]);

  return (
    <SectionCard title="Academic records">
      {rows.length === 0 ? <EmptyState icon={FileBarChart} title="No results yet" /> :
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground border-b border-border">
            <tr><th className="text-left py-2">Child</th><th className="text-left">Subject</th><th className="text-right">Score</th><th>Grade</th><th className="text-left">Term</th><th className="text-left">Date</th></tr>
          </thead>
          <tbody>{rows.map(r => (
            <tr key={r.id} className="border-b border-border last:border-0">
              <td className="py-3 font-medium">{kids[r.student_id] || "—"}</td>
              <td>{r.subject}</td>
              <td className="text-right tabular-nums font-semibold">{Math.round(Number(r.score))}%</td>
              <td className="text-center"><Badge variant="outline" className="bg-success/10 text-success border-success/30">{r.grade || "—"}</Badge></td>
              <td className="text-muted-foreground">{r.term}</td>
              <td className="text-muted-foreground text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
            </tr>
          ))}</tbody>
        </table></div>}
    </SectionCard>
  );
}
