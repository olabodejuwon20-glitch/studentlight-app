import { useEffect, useState } from "react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { FileBarChart } from "lucide-react";

export default function AdminReports() {
  const { school } = useSchool();
  const [perfData, setPerfData] = useState<any[]>([]);
  const [att, setAtt] = useState<any[]>([]);

  useEffect(() => {
    if (!school) return;
    (async () => {
      const { data: results } = await supabase.from("results").select("subject,score").eq("school_id", school.id);
      const bySubj: Record<string, { total: number; count: number }> = {};
      results?.forEach(r => { bySubj[r.subject] ??= { total: 0, count: 0 }; bySubj[r.subject].total += Number(r.score); bySubj[r.subject].count += 1; });
      setPerfData(Object.entries(bySubj).map(([subject, v]) => ({ subject, score: Math.round(v.total / v.count) })));

      const { data: at } = await supabase.from("attendance").select("status").eq("school_id", school.id);
      const counts: Record<string, number> = { present: 0, absent: 0, late: 0, excused: 0 };
      at?.forEach(a => counts[a.status]++);
      const colors: Record<string, string> = { present: "hsl(var(--success))", absent: "hsl(var(--destructive))", late: "hsl(var(--warning))", excused: "hsl(var(--muted-foreground))" };
      setAtt(Object.entries(counts).filter(([,v]) => v > 0).map(([k, v]) => ({ name: k, value: v, color: colors[k] })));
    })();
  }, [school]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <SectionCard title="Performance by Subject">
        {perfData.length === 0 ? <EmptyState icon={FileBarChart} title="No results yet" /> :
          <div className="h-[280px]"><ResponsiveContainer width="100%" height="100%">
            <BarChart data={perfData} margin={{ top: 5, right: 10, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="subject" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="score" fill="hsl(var(--primary))" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer></div>}
      </SectionCard>
      <SectionCard title="Attendance Distribution">
        {att.length === 0 ? <EmptyState icon={FileBarChart} title="No attendance data" /> :
          <div className="h-[280px]"><ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={att} dataKey="value" innerRadius={60} outerRadius={100}>{att.map((e, i) => <Cell key={i} fill={e.color} />)}</Pie>
              <Legend wrapperStyle={{ fontSize: 12 }} /><Tooltip />
            </PieChart>
          </ResponsiveContainer></div>}
      </SectionCard>
    </div>
  );
}
