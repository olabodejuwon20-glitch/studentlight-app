import { useEffect, useState } from "react";
import { BookOpen, Calendar, ClipboardCheck, PencilRuler, FileText, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { StatCard } from "@/components/dashboard/StatCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function TeacherDashboard() {
  const { school, user, displayName } = useSchool();
  const [classes, setClasses] = useState<any[]>([]);
  const [today, setToday] = useState<any[]>([]);
  const [examCount, setExamCount] = useState(0);
  const [attPct, setAttPct] = useState(0);

  useEffect(() => {
    if (!school || !user) return;
    (async () => {
      const dow = new Date().getDay() || 7;
      const [{ data: cls }, { count: ec }, { data: tt }, { data: att }] = await Promise.all([
        supabase.from("classes").select("*").eq("school_id", school.id).eq("teacher_id", user.id),
        supabase.from("exams").select("id", { count: "exact", head: true }).eq("school_id", school.id).eq("created_by", user.id),
        supabase.from("timetable").select("*").eq("school_id", school.id).eq("teacher_id", user.id).eq("day_of_week", dow).order("start_time"),
        supabase.from("attendance").select("status").eq("school_id", school.id).eq("marked_by", user.id),
      ]);
      setClasses(cls ?? []); setExamCount(ec ?? 0); setToday(tt ?? []);
      const total = att?.length ?? 0;
      setAttPct(total ? Math.round(((att!.filter(a => a.status === "present").length) / total) * 100) : 0);
    })();
  }, [school, user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold">Good morning, {displayName?.split(" ")[0] || "Teacher"}! 👋</h2>
          <p className="text-sm text-muted-foreground">Here's what's happening in your classes today.</p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-card"><Calendar className="size-3.5 text-muted-foreground" />{new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="My Classes" value={String(classes.length)} icon={BookOpen} tone="teacher" />
        <StatCard label="Today's Classes" value={String(today.length)} icon={Calendar} tone="info" />
        <StatCard label="Exams Created" value={String(examCount)} icon={PencilRuler} tone="warning" />
        <StatCard label="Attendance Today" value={`${attPct}%`} icon={ClipboardCheck} tone="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Today's Schedule">
          {today.length === 0
            ? <EmptyState icon={Calendar} title="Nothing scheduled today" />
            : <ul className="space-y-2">{today.map(t => (
                <li key={t.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                  <div className="text-xs font-mono w-16 tabular-nums text-muted-foreground">{t.start_time?.slice(0,5)}</div>
                  <div className="flex-1 min-w-0"><div className="font-medium">{t.subject}</div><div className="text-xs text-muted-foreground">Room {t.room || "—"}</div></div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-success/10 text-success">Today</span>
                </li>
              ))}</ul>}
        </SectionCard>

        <SectionCard title="Recent Activity">
          <EmptyState icon={Activity} title="No activity yet" desc="Your recent grading and attendance updates will appear here." />
        </SectionCard>
      </div>

      <SectionCard title="My Classes">
        {classes.length === 0
          ? <EmptyState icon={BookOpen} title="No classes assigned" desc="Ask your admin to assign classes to you." />
          : <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {classes.map(c => (
                <div key={c.id} className="rounded-xl border border-border p-4 bg-card">
                  <div className="text-xs text-muted-foreground">{c.code}</div>
                  <div className="font-semibold mt-1">{c.name}</div>
                  <div className="text-xs text-muted-foreground">{c.subject || "—"}</div>
                  <div className="mt-3 text-xs">
                    <span className="text-success font-semibold">90%</span> <span className="text-muted-foreground">Attendance</span>
                  </div>
                </div>
              ))}
            </div>}
      </SectionCard>

      <SectionCard title="Recent Submissions">
        <EmptyState icon={FileText} title="No submissions yet" desc="Student submissions will appear here when available." />
      </SectionCard>
    </div>
  );
}

