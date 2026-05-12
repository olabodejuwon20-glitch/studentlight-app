import { useEffect, useState } from "react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { FileBarChart, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCSV, printToPDF, tableHTML } from "@/lib/exporters";

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

  const exportAction = (
    <div className="flex items-center gap-2">
      <Button size="sm" variant="outline" disabled={!perfData.length && !att.length}
        onClick={() => {
          const rows = [
            ...perfData.map(p => ({ Section: "Performance", Key: p.subject, Value: p.score + "%" })),
            ...att.map(a => ({ Section: "Attendance", Key: a.name, Value: a.value })),
          ];
          downloadCSV(`${school?.slug || "school"}-report.csv`, rows);
        }}><Download className="size-4" /> <span className="hidden sm:inline ml-1">CSV</span></Button>
      <Button size="sm" variant="outline" disabled={!perfData.length && !att.length}
        onClick={() => {
          const html = `<h1>School Report</h1><div class="sub">${school?.name || ""}</div>
          <h3>Performance by subject</h3>${tableHTML(["Subject","Average"], perfData.map(p => [p.subject, p.score + "%"]))}
          <h3 style="margin-top:24px;">Attendance distribution</h3>${tableHTML(["Status","Count"], att.map(a => [a.name, a.value]))}`;
          printToPDF(`Report – ${school?.name || ""}`, html);
        }}><FileText className="size-4" /> <span className="hidden sm:inline ml-1">PDF</span></Button>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-lg">School analytics</h2>
          <p className="text-sm text-muted-foreground">Performance and attendance overview</p>
        </div>
        {exportAction}
      </div>
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
    </div>
  );
}
