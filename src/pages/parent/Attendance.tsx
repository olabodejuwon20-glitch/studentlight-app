import { useEffect, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";

export default function ParentAttendance() {
  const { school, user } = useSchool();
  const [groups, setGroups] = useState<{ name: string; rows: any[] }[]>([]);

  useEffect(() => {
    if (!school || !user) return;
    (async () => {
      const { data: links } = await supabase.from("parent_links").select("student_user_id").eq("school_id", school.id).eq("parent_user_id", user.id);
      const ids = (links ?? []).map(l => l.student_user_id);
      if (!ids.length) return;
      const [{ data: profs }, { data: att }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email").in("id", ids),
        supabase.from("attendance").select("*").eq("school_id", school.id).in("student_id", ids).order("date", { ascending: false }).limit(200),
      ]);
      const map = Object.fromEntries((profs ?? []).map(p => [p.id, p.full_name || p.email || "?"]));
      const g: Record<string, any[]> = {};
      (att ?? []).forEach(r => { (g[map[r.student_id] || "?"] ||= []).push(r); });
      setGroups(Object.entries(g).map(([name, rows]) => ({ name, rows })));
    })();
  }, [school, user]);

  if (!groups.length) return <SectionCard title="Attendance"><EmptyState icon={ClipboardCheck} title="No attendance records yet" /></SectionCard>;

  return (
    <div className="space-y-6">{groups.map(g => {
      const tot = g.rows.length;
      const pres = g.rows.filter(r => r.status === "present").length;
      return (
        <SectionCard key={g.name} title={g.name} description={`${pres}/${tot} days present (${Math.round(pres/tot*100)}%)`}>
          <ul className="divide-y divide-border max-h-[260px] overflow-y-auto">{g.rows.slice(0, 30).map(r => (
            <li key={r.id} className="py-2 flex items-center justify-between text-sm">
              <span>{new Date(r.date).toLocaleDateString(undefined, { weekday:"short", month:"short", day:"numeric" })}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === "present" ? "bg-success/10 text-success" : r.status === "absent" ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>{r.status}</span>
            </li>
          ))}</ul>
        </SectionCard>
      );
    })}</div>
  );
}
