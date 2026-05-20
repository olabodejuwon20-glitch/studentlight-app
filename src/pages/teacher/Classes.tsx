import { useEffect, useMemo, useState } from "react";
import { BookOpen, Users, Calendar, ClipboardCheck, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { schoolPath } from "@/lib/tenant";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";

export default function TeacherClasses() {
  const { school, user, activeRole } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [periods, setPeriods] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!school || !user) return;
    (async () => {
      const { data: cls } = await supabase.from("classes").select("*").eq("school_id", school.id).eq("teacher_id", user.id);
      setRows(cls ?? []);
      const ids = cls?.map(c => c.id) ?? [];
      if (!ids.length) return;
      const [{ data: enr }, { data: tt }] = await Promise.all([
        supabase.from("class_enrollments").select("class_id").in("class_id", ids),
        supabase.from("timetable").select("class_id").in("class_id", ids),
      ]);
      const cmap: Record<string, number> = {}, pmap: Record<string, number> = {};
      enr?.forEach(e => { cmap[e.class_id] = (cmap[e.class_id] ?? 0) + 1; });
      tt?.forEach(t => { pmap[t.class_id] = (pmap[t.class_id] ?? 0) + 1; });
      setCounts(cmap); setPeriods(pmap);
    })();
  }, [school, user]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return !s ? rows : rows.filter(r => `${r.code} ${r.name} ${r.subject ?? ""}`.toLowerCase().includes(s));
  }, [q, rows]);

  const base = school && activeRole ? schoolPath(school.slug, `/app/${activeRole}`) : "";

  return (
    <SectionCard title="My Classes" description={`${rows.length} class${rows.length === 1 ? "" : "es"} assigned`}
      action={
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search classes" className="pl-8 w-[220px]" />
        </div>
      }>
      {filtered.length === 0 ? <EmptyState icon={BookOpen} title={rows.length ? "No matches" : "No classes assigned"} desc={rows.length ? "Try another search." : "Ask your admin to assign classes."} /> :
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <Link key={c.id} to={`${base}/attendance`} className="group rounded-xl border border-border p-5 bg-card hover:shadow-soft transition">
              <div className="flex items-start justify-between">
                <div className="size-10 rounded-lg bg-teacher/10 text-teacher grid place-items-center"><BookOpen className="size-5" /></div>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{c.grade_level || c.code}</span>
              </div>
              <div className="mt-3 font-semibold group-hover:text-teacher transition">{c.code}</div>
              <div className="text-sm">{c.name}</div>
              <div className="text-xs text-muted-foreground">{c.subject || "—"}</div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 rounded-md bg-secondary/60 px-2 py-1.5"><Users className="size-3.5 text-info" /><span className="font-semibold">{counts[c.id] ?? 0}</span><span className="text-muted-foreground">students</span></div>
                <div className="flex items-center gap-1.5 rounded-md bg-secondary/60 px-2 py-1.5"><Calendar className="size-3.5 text-warning" /><span className="font-semibold">{periods[c.id] ?? 0}</span><span className="text-muted-foreground">periods</span></div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-teacher font-medium"><ClipboardCheck className="size-3.5" />Open attendance →</div>
            </Link>
          ))}
        </div>}
    </SectionCard>
  );
}
