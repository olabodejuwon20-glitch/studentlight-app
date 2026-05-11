import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { MonthCalendar, CalendarEvent } from "@/components/MonthCalendar";

export default function StudentCalendar() {
  const { school } = useSchool();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [anns, setAnns] = useState<any[]>([]);

  useEffect(() => {
    if (!school) return;
    (async () => {
      const [{ data: e }, { data: a }] = await Promise.all([
        supabase.from("exams").select("id,title,subject,scheduled_at").eq("school_id", school.id).not("scheduled_at", "is", null).order("scheduled_at"),
        supabase.from("announcements").select("id,title,body,created_at").eq("school_id", school.id).order("created_at", { ascending: false }).limit(10),
      ]);
      const exEvents: CalendarEvent[] = (e ?? []).map(x => ({ id: `e-${x.id}`, date: new Date(x.scheduled_at), title: x.title, type: "exam", meta: x.subject }));
      const annEvents: CalendarEvent[] = (a ?? []).map(x => ({ id: `a-${x.id}`, date: new Date(x.created_at), title: x.title, type: "announcement" }));
      setEvents([...exEvents, ...annEvents]);
      setAnns(a ?? []);
    })();
  }, [school]);

  return (
    <div className="space-y-6">
      <MonthCalendar events={events} accent="student" />
      <SectionCard title="Recent announcements">
        {anns.length === 0 ? <EmptyState icon={Megaphone} title="Nothing posted yet" /> :
          <ul className="space-y-3">{anns.map(a => (
            <li key={a.id} className="rounded-lg border border-border p-4">
              <div className="font-semibold">{a.title}</div>
              {a.body && <div className="text-sm text-muted-foreground mt-1">{a.body}</div>}
              <div className="text-[11px] text-muted-foreground mt-2">{new Date(a.created_at).toLocaleString()}</div>
            </li>
          ))}</ul>}
      </SectionCard>
    </div>
  );
}
