import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, AlertTriangle, Check, X, Clock, ShieldCheck, Percent } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Row = { class_id: string; student_id: string; status: string; date: string };

export default function AdminAttendance() {
  const { school } = useSchool();
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [windowDays, setWindowDays] = useState<number>(7);
  const [classes, setClasses] = useState<any[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!school) return;
    supabase.from("classes").select("id,code,name").eq("school_id", school.id)
      .then(({ data }) => setClasses(data ?? []));
  }, [school]);

  useEffect(() => {
    if (!school) return;
    (async () => {
      setLoading(true);
      const since = new Date(new Date(date).getTime() - (windowDays - 1) * 86400_000).toISOString().slice(0, 10);
      const { data } = await supabase
        .from("attendance")
        .select("class_id,student_id,status,date")
        .eq("school_id", school.id)
        .gte("date", since)
        .lte("date", date);
      setRows((data ?? []) as Row[]);
      const ids = Array.from(new Set((data ?? []).map(r => r.student_id)));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);
        setProfiles(Object.fromEntries((profs ?? []).map(p => [p.id, p.full_name || p.email || "?"])));
      } else setProfiles({});
      setLoading(false);
    })();
  }, [school, date, windowDays]);

  const totals = useMemo(() => {
    const t = { total: rows.length, present: 0, absent: 0, late: 0, excused: 0 };
    rows.forEach(r => { (t as any)[r.status] = ((t as any)[r.status] ?? 0) + 1; });
    return t;
  }, [rows]);

  const rate = totals.total ? Math.round(((totals.present + totals.late) / totals.total) * 100) : 0;

  const byClass = useMemo(() => {
    const m: Record<string, { total: number; present: number }> = {};
    rows.forEach(r => {
      const c = (m[r.class_id] ||= { total: 0, present: 0 });
      c.total += 1; if (r.status === "present" || r.status === "late") c.present += 1;
    });
    return Object.entries(m).map(([class_id, v]) => {
      const cls = classes.find(c => c.id === class_id);
      return { class_id, name: cls ? `${cls.code} · ${cls.name}` : "—", ...v, rate: v.total ? Math.round((v.present / v.total) * 100) : 0 };
    }).sort((a, b) => a.rate - b.rate);
  }, [rows, classes]);

  const lowStudents = useMemo(() => {
    const m: Record<string, { total: number; present: number }> = {};
    rows.forEach(r => {
      const c = (m[r.student_id] ||= { total: 0, present: 0 });
      c.total += 1; if (r.status === "present" || r.status === "late") c.present += 1;
    });
    return Object.entries(m)
      .map(([id, v]) => ({ id, name: profiles[id] || "?", ...v, rate: v.total ? Math.round((v.present / v.total) * 100) : 0 }))
      .filter(s => s.total >= 3 && s.rate < 70)
      .sort((a, b) => a.rate - b.rate)
      .slice(0, 20);
  }, [rows, profiles]);

  function exportCsv() {
    const lines = ["date,class,student,status"];
    const cls = Object.fromEntries(classes.map(c => [c.id, `${c.code} · ${c.name}`]));
    rows.forEach(r => lines.push(`${r.date},"${cls[r.class_id] ?? ""}","${(profiles[r.student_id] ?? "").replace(/"/g, "'")}",${r.status}`));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `attendance-${date}-${windowDays}d.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Attendance Overview"
        description={`Showing last ${windowDays} day(s) up to ${date}`}
        action={
          <div className="flex flex-wrap gap-2 items-center">
            <Input type="date" value={date} max={new Date().toISOString().slice(0,10)} onChange={e => setDate(e.target.value)} className="w-[160px]" />
            <Select value={String(windowDays)} onValueChange={v => setWindowDays(Number(v))}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Single day</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last term (90d)</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCsv} disabled={!rows.length}>Export CSV</Button>
          </div>
        }
      >
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <StatCard label="Overall rate" value={`${rate}%`} icon={Percent} tone="info"     sub={`${totals.present + totals.late}/${totals.total} attended`} />
          <StatCard label="Present"      value={totals.present} icon={Check}       tone="success" />
          <StatCard label="Absent"       value={totals.absent}  icon={X}           tone="warning" />
          <StatCard label="Late"         value={totals.late}    icon={Clock}       tone="warning" />
          <StatCard label="Excused"      value={totals.excused} icon={ShieldCheck} tone="info" />
        </div>
      </SectionCard>

      <SectionCard title="By class" description="Sorted by lowest attendance rate first">
        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> :
          byClass.length === 0 ? <EmptyState icon={ClipboardCheck} title="No attendance recorded" desc="Teachers will see classes here once they start marking attendance." /> :
          <ul className="divide-y divide-border">
            {byClass.map(c => (
              <li key={c.class_id} className="py-2 flex items-center gap-3">
                <span className="flex-1">{c.name}</span>
                <span className="text-xs text-muted-foreground">{c.present}/{c.total}</span>
                <span className={cn("text-xs px-2 py-0.5 rounded-full",
                  c.rate < 70 ? "bg-destructive/10 text-destructive" :
                  c.rate < 90 ? "bg-warning/10 text-warning" : "bg-success/10 text-success")}>{c.rate}%</span>
              </li>
            ))}
          </ul>}
      </SectionCard>

      <SectionCard
        title="At-risk students"
        description="Students below 70% attendance in the selected window"
        action={lowStudents.length ? <span className="text-xs text-warning flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> {lowStudents.length} flagged</span> : null}
      >
        {lowStudents.length === 0 ? <EmptyState icon={ClipboardCheck} title="All students above 70%" /> :
          <ul className="divide-y divide-border">
            {lowStudents.map(s => (
              <li key={s.id} className="py-2 flex items-center gap-3">
                <span className="flex-1">{s.name}</span>
                <span className="text-xs text-muted-foreground">{s.present}/{s.total} days</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">{s.rate}%</span>
              </li>
            ))}
          </ul>}
      </SectionCard>
    </div>
  );
}