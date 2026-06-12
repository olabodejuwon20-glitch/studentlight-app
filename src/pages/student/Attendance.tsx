import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";

export default function StudentAttendance() {
  const { school, user } = useSchool();
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    if (!school || !user) return;
    supabase.from("attendance").select("*").eq("school_id", school.id).eq("student_id", user.id)
      .order("date", { ascending: false }).limit(180)
      .then(({ data }) => setRows(data ?? []));
  }, [school, user]);

  const stats = useMemo(() => {
    const total = rows.length;
    const present = rows.filter(r => r.status === "present").length;
    const late = rows.filter(r => r.status === "late").length;
    const absent = rows.filter(r => r.status === "absent").length;
    const excused = rows.filter(r => r.status === "excused").length;
    const rate = total ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, late, absent, excused, rate };
  }, [rows]);

  if (!rows.length) return <SectionCard title="My Attendance"><EmptyState icon={ClipboardCheck} title="No attendance records yet" /></SectionCard>;

  return (
    <SectionCard title="My Attendance" description={`${stats.rate}% attendance · ${stats.present + stats.late}/${stats.total} days`}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-xs">
        <div className="rounded-lg border p-2"><div className="text-muted-foreground">Present</div><div className="text-lg font-semibold text-success">{stats.present}</div></div>
        <div className="rounded-lg border p-2"><div className="text-muted-foreground">Late</div><div className="text-lg font-semibold text-warning">{stats.late}</div></div>
        <div className="rounded-lg border p-2"><div className="text-muted-foreground">Absent</div><div className="text-lg font-semibold text-destructive">{stats.absent}</div></div>
        <div className="rounded-lg border p-2"><div className="text-muted-foreground">Excused</div><div className="text-lg font-semibold">{stats.excused}</div></div>
      </div>
      <ul className="divide-y divide-border max-h-[400px] overflow-y-auto">
        {rows.map(r => (
          <li key={r.id} className="py-2 flex items-center justify-between text-sm">
            <span>{new Date(r.date).toLocaleDateString(undefined, { weekday: "short", year: "numeric", month: "short", day: "numeric" })}</span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full",
              r.status === "present" ? "bg-success/10 text-success" :
              r.status === "late" ? "bg-warning/10 text-warning" :
              r.status === "absent" ? "bg-destructive/10 text-destructive" :
              "bg-muted text-muted-foreground")}>{r.status}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}