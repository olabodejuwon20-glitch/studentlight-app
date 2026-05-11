import { useEffect, useState } from "react";
import { Calendar as CalIcon, FileText, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";

export default function StudentCalendar() {
  const { school } = useSchool();
  const [exams, setExams] = useState<any[]>([]);
  const [anns, setAnns] = useState<any[]>([]);

  useEffect(() => {
    if (!school) return;
    (async () => {
      const [{ data: e }, { data: a }] = await Promise.all([
        supabase.from("exams").select("id,title,subject,scheduled_at").eq("school_id", school.id).gte("scheduled_at", new Date().toISOString()).order("scheduled_at"),
        supabase.from("announcements").select("id,title,body,created_at").eq("school_id", school.id).order("created_at", { ascending: false }).limit(10),
      ]);
      setExams(e ?? []); setAnns(a ?? []);
    })();
  }, [school]);

  return (
    <div className="space-y-6">
      <SectionCard title="Upcoming exams">
        {exams.length === 0 ? <EmptyState icon={CalIcon} title="No upcoming exams" /> :
          <ul className="divide-y divide-border">{exams.map(e => (
            <li key={e.id} className="py-3 flex items-center gap-3">
              <div className="size-10 rounded-lg bg-student/10 grid place-items-center"><FileText className="size-4 text-student" /></div>
              <div className="flex-1"><div className="font-medium">{e.title}</div><div className="text-xs text-muted-foreground">{e.subject || "—"}</div></div>
              <div className="text-xs text-muted-foreground">{new Date(e.scheduled_at).toLocaleString()}</div>
            </li>
          ))}</ul>}
      </SectionCard>
      <SectionCard title="School announcements">
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
