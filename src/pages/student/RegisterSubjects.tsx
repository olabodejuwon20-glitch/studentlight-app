import { useEffect, useMemo, useState } from "react";
import { BookOpen, Search, Check, Plus, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function StudentRegisterSubjects() {
  const { school, user } = useSchool();
  const [classes, setClasses] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<Record<string, string>>({});
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    if (!school || !user) return;
    const { data: cls } = await supabase.from("classes").select("*").eq("school_id", school.id).order("code");
    setClasses(cls ?? []);
    const tids = Array.from(new Set((cls ?? []).map(c => c.teacher_id).filter(Boolean)));
    if (tids.length) {
      const { data: p } = await supabase.rpc("get_public_profiles", { _ids: tids });
      setTeachers(Object.fromEntries((p ?? []).map((x: any) => [x.id, x.full_name || "—"])));
    }
    const { data: enr } = await supabase.from("class_enrollments").select("class_id").eq("student_id", user.id);
    setEnrolled(new Set((enr ?? []).map((x: any) => x.class_id)));
  }
  useEffect(() => { load(); }, [school, user]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return !s ? classes : classes.filter(c => `${c.code} ${c.name} ${c.subject ?? ""} ${c.grade_level ?? ""}`.toLowerCase().includes(s));
  }, [classes, q]);

  async function toggle(c: any) {
    if (!school || !user) return;
    setBusy(c.id);
    if (enrolled.has(c.id)) {
      const { error } = await supabase.from("class_enrollments")
        .delete().eq("class_id", c.id).eq("student_id", user.id);
      if (error) toast.error(error.message);
      else { enrolled.delete(c.id); setEnrolled(new Set(enrolled)); toast.success(`Withdrew from ${c.code}`); }
    } else {
      const { error } = await supabase.from("class_enrollments")
        .insert({ class_id: c.id, student_id: user.id, school_id: school.id });
      if (error) toast.error(error.message);
      else { enrolled.add(c.id); setEnrolled(new Set(enrolled)); toast.success(`Registered for ${c.code}`); }
    }
    setBusy(null);
  }

  return (
    <SectionCard
      title="Register Subjects"
      description={`${enrolled.size} of ${classes.length} registered`}
      action={
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search subjects" className="pl-8 w-[240px]" />
        </div>
      }
    >
      {!filtered.length ? <EmptyState icon={BookOpen} title="No subjects available" desc="Ask your school admin to add classes." /> :
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => {
            const on = enrolled.has(c.id);
            return (
              <div key={c.id} className="rounded-xl border border-border p-5 bg-card">
                <div className="flex items-start justify-between">
                  <div className="size-10 rounded-lg bg-student/10 text-student grid place-items-center"><BookOpen className="size-5" /></div>
                  {on && <Badge className="bg-student/15 text-student border-0">Registered</Badge>}
                </div>
                <div className="mt-3 font-semibold">{c.code}</div>
                <div className="text-sm">{c.name}</div>
                <div className="text-xs text-muted-foreground">{c.subject || "—"} · {c.grade_level || "—"}</div>
                {c.teacher_id && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs">
                    <GraduationCap className="size-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Teacher:</span> <span className="font-medium">{teachers[c.teacher_id] || "—"}</span>
                  </div>
                )}
                <Button className="mt-4 w-full" size="sm" variant={on ? "secondary" : "default"}
                  disabled={busy === c.id} onClick={() => toggle(c)}>
                  {on ? <><Check className="size-4 mr-1.5" />Withdraw</> : <><Plus className="size-4 mr-1.5" />Register</>}
                </Button>
              </div>
            );
          })}
        </div>}
    </SectionCard>
  );
}