import { useEffect, useState } from "react";
import { BookOpen, Users, Calendar, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";

export default function StudentClasses() {
  const { school, user } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<Record<string, string>>({});
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [periods, setPeriods] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!school || !user) return;
    (async () => {
      const { data: enr } = await supabase.from("class_enrollments").select("class_id").eq("student_id", user.id);
      const ids = enr?.map(e => e.class_id) ?? [];
      if (!ids.length) return setRows([]);
      const { data: cls } = await supabase.from("classes").select("*").in("id", ids);
      setRows(cls ?? []);
      const tids = Array.from(new Set((cls ?? []).map(c => c.teacher_id).filter(Boolean)));
      const [{ data: profs }, { data: allEnr }, { data: tt }] = await Promise.all([
        tids.length ? supabase.rpc("get_public_profiles", { _ids: tids }) : Promise.resolve({ data: [] as any[] }),
        supabase.from("class_enrollments").select("class_id").in("class_id", ids),
        supabase.from("timetable").select("class_id").in("class_id", ids),
      ]);
      setTeachers(Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name || "—"])));
      const cm: Record<string, number> = {}, pm: Record<string, number> = {};
      allEnr?.forEach(e => { cm[e.class_id] = (cm[e.class_id] ?? 0) + 1; });
      tt?.forEach(t => { pm[t.class_id] = (pm[t.class_id] ?? 0) + 1; });
      setCounts(cm); setPeriods(pm);
    })();
  }, [school, user]);

  return (
    <SectionCard title="My Classes" description={`${rows.length} enrolled`}>
      {rows.length === 0 ? <EmptyState icon={BookOpen} title="Not enrolled in any class" /> :
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{rows.map(c => (
          <div key={c.id} className="rounded-xl border border-border p-5 bg-card hover:shadow-soft transition">
            <div className="flex items-start justify-between">
              <div className="size-10 rounded-lg bg-student/10 text-student grid place-items-center"><BookOpen className="size-5" /></div>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{c.grade_level || c.code}</span>
            </div>
            <div className="mt-3 font-semibold">{c.code}</div>
            <div className="text-sm">{c.name}</div>
            <div className="text-xs text-muted-foreground">{c.subject || "—"}</div>
            {c.teacher_id && (
              <div className="mt-3 flex items-center gap-1.5 text-xs"><GraduationCap className="size-3.5 text-muted-foreground" /><span className="text-muted-foreground">Teacher:</span> <span className="font-medium">{teachers[c.teacher_id] || "—"}</span></div>
            )}
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 rounded-md bg-secondary/60 px-2 py-1.5"><Users className="size-3.5 text-info" /><span className="font-semibold">{counts[c.id] ?? 0}</span><span className="text-muted-foreground">students</span></div>
              <div className="flex items-center gap-1.5 rounded-md bg-secondary/60 px-2 py-1.5"><Calendar className="size-3.5 text-warning" /><span className="font-semibold">{periods[c.id] ?? 0}</span><span className="text-muted-foreground">periods</span></div>
            </div>
          </div>
        ))}</div>}
    </SectionCard>
  );
}
