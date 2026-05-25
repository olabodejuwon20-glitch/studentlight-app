import { useEffect, useMemo, useState } from "react";
import { Users, Search, Check, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function AdminEnrollments() {
  const { school } = useSchool();
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState<string>("");
  const [students, setStudents] = useState<any[]>([]);
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!school) return;
    supabase.from("classes").select("id,code,name,subject,grade_level")
      .eq("school_id", school.id).order("code")
      .then(({ data }) => { setClasses(data ?? []); if (data?.[0] && !classId) setClassId(data[0].id); });
  }, [school]);

  async function loadStudents() {
    if (!school) return;
    const { data: m } = await supabase.from("memberships")
      .select("user_id").eq("school_id", school.id).eq("role", "student").eq("status", "active");
    const ids = (m ?? []).map(x => x.user_id);
    if (!ids.length) { setStudents([]); return; }
    const { data: p } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);
    setStudents(p ?? []);
  }
  async function loadEnrolled() {
    if (!classId) return setEnrolled(new Set());
    const { data } = await supabase.from("class_enrollments").select("student_id").eq("class_id", classId);
    setEnrolled(new Set((data ?? []).map((x: any) => x.student_id)));
  }
  useEffect(() => { loadStudents(); }, [school]);
  useEffect(() => { loadEnrolled(); }, [classId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return !s ? students : students.filter(x => (x.full_name || x.email || "").toLowerCase().includes(s));
  }, [students, q]);

  async function toggle(studentId: string) {
    if (!school || !classId) return;
    setLoading(true);
    if (enrolled.has(studentId)) {
      const { error } = await supabase.from("class_enrollments")
        .delete().eq("class_id", classId).eq("student_id", studentId);
      if (error) toast.error(error.message);
      else { enrolled.delete(studentId); setEnrolled(new Set(enrolled)); toast.success("Removed"); }
    } else {
      const { error } = await supabase.from("class_enrollments")
        .insert({ class_id: classId, student_id: studentId, school_id: school.id });
      if (error) toast.error(error.message);
      else { enrolled.add(studentId); setEnrolled(new Set(enrolled)); toast.success("Enrolled"); }
    }
    setLoading(false);
  }

  const cls = classes.find(c => c.id === classId);

  return (
    <SectionCard
      title="Class Enrollments"
      description={cls ? `${cls.code} · ${cls.name}` : "Assign students to classes"}
      action={
        <div className="flex gap-2">
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="w-[260px]"><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>{classes.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.code} · {c.name}{c.grade_level ? ` (${c.grade_level})` : ""}</SelectItem>
            ))}</SelectContent>
          </Select>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search students" className="pl-8 w-[220px]" />
          </div>
        </div>
      }
    >
      {!classes.length ? <EmptyState icon={Users} title="No classes yet" desc="Create a class first." /> :
        !filtered.length ? <EmptyState icon={Users} title="No students found" /> :
        <div className="rounded-xl border border-border divide-y divide-border">
          <div className="px-4 py-2 text-xs text-muted-foreground flex items-center justify-between">
            <span>{filtered.length} students</span>
            <Badge variant="secondary">{enrolled.size} enrolled</Badge>
          </div>
          {filtered.map(s => {
            const on = enrolled.has(s.id);
            return (
              <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                <div className="size-9 rounded-full bg-student/10 text-student grid place-items-center font-medium">
                  {(s.full_name || s.email || "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{s.full_name || "—"}</div>
                  <div className="text-xs text-muted-foreground truncate">{s.email}</div>
                </div>
                <Button size="sm" variant={on ? "secondary" : "default"} disabled={loading} onClick={() => toggle(s.id)}>
                  {on ? <><Check className="size-4 mr-1.5" />Enrolled</> : <><Plus className="size-4 mr-1.5" />Add</>}
                </Button>
              </div>
            );
          })}
        </div>}
    </SectionCard>
  );
}