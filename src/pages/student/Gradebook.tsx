import { useEffect, useMemo, useState } from "react";
import { BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StudentGradebook() {
  const { school, user } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  const [term, setTerm] = useState("all");
  useEffect(() => {
    if (!school || !user) return;
    supabase.from("gradebook_entries").select("*").eq("school_id", school.id).eq("student_id", user.id).order("recorded_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  }, [school, user]);

  const terms = useMemo(() => Array.from(new Set(rows.map(r => r.term))), [rows]);
  const filtered = useMemo(() => term === "all" ? rows : rows.filter(r => r.term === term), [rows, term]);

  const bySubject = useMemo(() => {
    const m: Record<string, { sum: number; max: number }> = {};
    filtered.forEach(r => {
      m[r.subject] ||= { sum: 0, max: 0 };
      m[r.subject].sum += Number(r.score);
      m[r.subject].max += Number(r.max_score);
    });
    return Object.entries(m).map(([subject, v]) => ({ subject, ...v, pct: v.max ? Math.round((v.sum / v.max) * 100) : 0 }));
  }, [filtered]);

  return (
    <div className="space-y-6">
      <SectionCard title="My continuous assessment" description="Scores recorded by your teachers"
        action={
          <Select value={term} onValueChange={setTerm}>
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All terms</SelectItem>
              {terms.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        }>
        {bySubject.length === 0 ? <EmptyState icon={BarChart3} title="No CA scores yet" /> :
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {bySubject.map(s => (
              <div key={s.subject} className="rounded-lg border border-border p-4 bg-card">
                <div className="text-xs text-muted-foreground">{s.subject}</div>
                <div className="mt-1 text-2xl font-display font-bold tabular-nums">{s.pct}%</div>
                <div className="text-xs text-muted-foreground">{s.sum} / {s.max}</div>
              </div>
            ))}
          </div>}
      </SectionCard>
      <SectionCard title="All entries">
        {filtered.length === 0 ? <EmptyState icon={BarChart3} title="No entries" /> :
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b border-border"><tr><th className="text-left py-2">Date</th><th className="text-left">Subject</th><th className="text-left">Title</th><th>Category</th><th>Term</th><th className="text-right">Score</th></tr></thead>
            <tbody>{filtered.map(r => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="py-3 text-muted-foreground">{new Date(r.recorded_at).toLocaleDateString()}</td>
                <td>{r.subject}</td>
                <td className="font-medium">{r.title}</td>
                <td className="text-center"><span className="text-[10px] px-2 py-0.5 rounded bg-secondary">{r.category}</span></td>
                <td className="text-center text-xs text-muted-foreground">{r.term}</td>
                <td className="text-right tabular-nums font-semibold">{Number(r.score)}/{Number(r.max_score)}</td>
              </tr>
            ))}</tbody>
          </table></div>}
      </SectionCard>
    </div>
  );
}