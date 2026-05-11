import { useEffect, useState } from "react";
import { Calendar as CalIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { MonthCalendar, CalendarEvent } from "@/components/MonthCalendar";

const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function TeacherCalendar() {
  const { school, user } = useSchool();
  const [tt, setTt] = useState<any[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    if (!school || !user) return;
    (async () => {
      const [{ data: t }, { data: e }, { data: a }] = await Promise.all([
        supabase.from("timetable").select("*").eq("school_id", school.id).eq("teacher_id", user.id).order("day_of_week").order("start_time"),
        supabase.from("exams").select("id,title,subject,scheduled_at").eq("school_id", school.id).eq("created_by", user.id).not("scheduled_at", "is", null),
        supabase.from("announcements").select("id,title,created_at").eq("school_id", school.id).order("created_at", { ascending: false }).limit(20),
      ]);
      setTt(t ?? []);
      const exEvts: CalendarEvent[] = (e ?? []).map(x => ({ id: `e-${x.id}`, date: new Date(x.scheduled_at), title: x.title, type: "exam" }));
      const annEvts: CalendarEvent[] = (a ?? []).map(x => ({ id: `a-${x.id}`, date: new Date(x.created_at), title: x.title, type: "announcement" }));
      setEvents([...exEvts, ...annEvts]);
    })();
  }, [school, user]);

  return (
    <div className="space-y-6">
      <MonthCalendar events={events} accent="teacher" />
      <SectionCard title="Weekly schedule">
        {tt.length === 0 ? <EmptyState icon={CalIcon} title="No periods assigned" /> :
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
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
    </div>
  );
}