import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { MonthCalendar, CalendarEvent } from "@/components/MonthCalendar";

export default function ParentCalendar() {
  const { school } = useSchool();
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    if (!school) return;
    (async () => {
      const [{ data: e }, { data: a }] = await Promise.all([
        supabase.from("exams").select("id,title,scheduled_at").eq("school_id", school.id).not("scheduled_at", "is", null),
        supabase.from("announcements").select("id,title,created_at").eq("school_id", school.id).order("created_at", { ascending: false }).limit(30),
      ]);
      setEvents([
        ...(e ?? []).map(x => ({ id: `e-${x.id}`, date: new Date(x.scheduled_at), title: x.title, type: "exam" as const })),
        ...(a ?? []).map(x => ({ id: `a-${x.id}`, date: new Date(x.created_at), title: x.title, type: "announcement" as const })),
      ]);
    })();
  }, [school]);

  return <MonthCalendar events={events} accent="parent" />;
}