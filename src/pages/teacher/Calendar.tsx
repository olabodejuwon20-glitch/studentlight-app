import { useEffect, useState } from "react";
import { Calendar as CalIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function TeacherCalendar() {
  const { school, user } = useSchool();
  const [tt, setTt] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);

  useEffect(() => {
    if (!school || !user) return;
    (async () => {
      const [{ data: t }, { data: e }] = await Promise.all([
        supabase.from("timetable").select("*").eq("school_id", school.id).eq("teacher_id", user.id).order("day_of_week").order("start_time"),
        supabase.from("exams").select("id,title,subject,scheduled_at").eq("school_id", school.id).eq("created_by", user.id).order("scheduled_at"),
      ]);
      setTt(t ?? []); setExams(e ?? []);
    })();
  }, [school, user]);

  return (
    <div className="space-y-6">
      <SectionCard title="Weekly schedule">
        {tt.length === 0 ? <EmptyState icon={CalIcon} title="No periods assigned" /> :
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {DAYS.map((d, i) => {
              const day = tt.filter(x => x.day_of_week === (i || 7));
              return (
                <div key={d} className="rounded-lg border border-border p-3 bg-card">
                  <div className="text-xs font-semibold mb-2">{d}</div>
                  {day.length === 0 ? <div className="text-xs text-muted-foreground">—</div> :
                    day.map(p => (
                      <div key={p.id} className="text-xs mb-2 border-l-2 border-teacher pl-2">
                        <div className="font-medium">{p.subject}</div>
                        <div className="text-muted-foreground">{p.start_time?.slice(0,5)}–{p.end_time?.slice(0,5)}</div>
                      </div>
                    ))}
                </div>
              );
            })}
          </div>}
      </SectionCard>

      <SectionCard title="Upcoming exams I created">
        {exams.length === 0 ? <EmptyState icon={CalIcon} title="No upcoming exams" /> :
          <ul className="divide-y divide-border">{exams.map(e => (
            <li key={e.id} className="py-3 flex items-center justify-between">
              <div><div className="font-medium">{e.title}</div><div className="text-xs text-muted-foreground">{e.subject || "—"}</div></div>
              <div className="text-xs text-muted-foreground">{e.scheduled_at ? new Date(e.scheduled_at).toLocaleString() : "Not scheduled"}</div>
            </li>
          ))}</ul>}
      </SectionCard>
    </div>
  );
}