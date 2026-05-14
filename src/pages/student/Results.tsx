import { useEffect, useMemo, useState } from "react";
import { FileBarChart, TrendingUp, Award, Target, Download, FileText, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCSV, printToPDF, tableHTML } from "@/lib/exporters";
import { downloadResultSlip } from "@/lib/slip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { necoGrade, necoDistribution, necoSummary, NECO_GRADE_REMARKS, NECO_GRADE_COLORS } from "@/lib/neco";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";

export default function StudentResults() {
  const { school, user } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  const [slipLoading, setSlipLoading] = useState(false);
  useEffect(() => {
    if (!school || !user) return;
    supabase.from("results").select("*").eq("school_id", school.id).eq("student_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setRows(data ?? []));
  }, [school, user]);

  const scores = rows.map(r => Number(r.score));
  const s = useMemo(() => necoSummary(scores), [rows]);
  const dist = useMemo(() => necoDistribution(scores), [rows]);
  const bySubj = useMemo(() => {
    const m: Record<string, number[]> = {};
    rows.forEach(r => { (m[r.subject] ||= []).push(Number(r.score)); });
    return Object.entries(m).map(([subject, arr]) => ({
      subject,
      avg: Math.round(arr.reduce((a,b)=>a+b,0)/arr.length),
      grade: necoGrade(arr.reduce((a,b)=>a+b,0)/arr.length),
    }));
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-lg">My results</h2>
          <p className="text-sm text-muted-foreground">NECO-aligned academic performance</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={!rows.length}
            onClick={() => downloadCSV(`${school?.slug || "school"}-my-results.csv`,
              rows.map(r => ({ Subject: r.subject, Score: Math.round(Number(r.score))+"%", Grade: necoGrade(Number(r.score)), Term: r.term, Date: new Date(r.created_at).toLocaleDateString() })))}>
            <Download className="size-4" /> <span className="hidden sm:inline ml-1">CSV</span>
          </Button>
          <Button size="sm" variant="outline" disabled={!rows.length}
            onClick={() => {
              const html = `<h1>Academic Report</h1><div class="sub">${school?.name || ""}</div>
              <div class="grid">
                <div class="card"><div class="label">Overall</div><div class="value">${s.average}% (${s.grade})</div></div>
                <div class="card"><div class="label">Credit pass</div><div class="value">${s.credit}%</div></div>
                <div class="card"><div class="label">Best</div><div class="value">${s.best}%</div></div>
                <div class="card"><div class="label">Subjects</div><div class="value">${bySubj.length}</div></div>
              </div>
              ${tableHTML(["Subject","Score","NECO","Term","Date"], rows.map(r => [r.subject, Math.round(Number(r.score))+"%", necoGrade(Number(r.score)), r.term, new Date(r.created_at).toLocaleDateString()]))}`;
              printToPDF(`My Results – ${school?.name || ""}`, html);
            }}>
            <FileText className="size-4" /> <span className="hidden sm:inline ml-1">PDF</span>
          </Button>
          <Button size="sm" disabled={!rows.length || slipLoading || !user}
            onClick={async () => {
              if (!user) return;
              setSlipLoading(true);
              try { await downloadResultSlip(user.id); toast.success("Result slip downloaded"); }
              catch (e: any) { toast.error(e.message ?? "Failed to generate slip"); }
              finally { setSlipLoading(false); }
            }}>
            <FileDown className="size-4" /> <span className="hidden sm:inline ml-1">{slipLoading ? "Generating…" : "Result slip"}</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Overall average" value={s.count ? `${s.average}%` : "—"} icon={TrendingUp} tone="student" sub={`Grade ${s.grade}`} />
        <StatCard label="Credit pass rate" value={`${s.credit}%`} icon={Target} tone="success" sub="C6 or better" />
        <StatCard label="Best score" value={s.count ? `${s.best}%` : "—"} icon={Award} tone="warning" sub="Top subject" />
        <StatCard label="Subjects" value={String(bySubj.length)} icon={FileBarChart} tone="info" sub="Recorded" />
      </div>

      {rows.length === 0 ? (
        <SectionCard title="My results"><EmptyState icon={FileBarChart} title="No results yet" /></SectionCard>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="NECO grade distribution" description="A1–F9 across all subjects">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dist}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="grade" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis allowDecimals={false} stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="count" radius={[6,6,0,0]}>
                      {dist.map((d,i) => <Cell key={i} fill={d.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
            <SectionCard title="Subject mastery" description="Average per subject (NECO)">
              <div className="h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={bySubj}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0,100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                    <Radar dataKey="avg" stroke="hsl(var(--student))" fill="hsl(var(--student))" fillOpacity={0.35} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="My results" description="NECO grading: A1–F9">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{rows.map(r => {
              const g = necoGrade(Number(r.score));
              return (
                <div key={r.id} className="rounded-xl border border-border p-5 bg-card">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">{r.subject}</div>
                    <Badge variant="outline" style={{ background: NECO_GRADE_COLORS[g] + "22", color: NECO_GRADE_COLORS[g], borderColor: NECO_GRADE_COLORS[g] + "55" }}>{g}</Badge>
                  </div>
                  <div className="text-3xl font-display font-bold mt-2">{Math.round(Number(r.score))}%</div>
                  <div className="text-xs text-muted-foreground mt-1">{r.term} · {NECO_GRADE_REMARKS[g]}</div>
                  {r.remarks && <div className="text-xs mt-2 italic text-muted-foreground">"{r.remarks}"</div>}
                </div>
              );
            })}</div>
          </SectionCard>
        </>
      )}
    </div>
  );
}
