import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Status = "present" | "absent" | "late" | "excused";

export default function TeacherAttendance() {
  const { school, user } = useSchool();
  const [classes, setClasses] = useState<any[]>([]);
  const [classId, setClassId] = useState<string>("");
  const [students, setStudents] = useState<any[]>([]);
  const [marks, setMarks] = useState<Record<string, Status>>({});
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  useEffect(() => {
    if (!school || !user) return;
    supabase.from("classes").select("*").eq("school_id", school.id).eq("teacher_id", user.id)
      .then(({ data }) => { setClasses(data ?? []); if (data?.[0]) setClassId(data[0].id); });
  }, [school, user]);

  useEffect(() => {
    if (!classId || !school) return;
    (async () => {
      const { data: enr } = await supabase.from("class_enrollments").select("student_id").eq("class_id", classId);
      const ids = enr?.map(e => e.student_id) ?? [];
      if (!ids.length) return setStudents([]);
      const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);
      setStudents(profs ?? []);
      const { data: existing } = await supabase.from("attendance").select("student_id,status").eq("class_id", classId).eq("date", today);
      const init: Record<string, Status> = {}; existing?.forEach(r => init[r.student_id] = r.status as Status);
      setMarks(init);
    })();
  }, [classId, school, today]);

  async function save() {
    if (!school || !classId) return;
    const rows = Object.entries(marks).map(([student_id, status]) => ({ school_id: school.id, class_id: classId, student_id, date: today, status, marked_by: user!.id }));
    if (!rows.length) return toast("Nothing to save");
    const { error } = await supabase.from("attendance").upsert(rows, { onConflict: "class_id,student_id,date" });
    if (error) toast.error(error.message); else toast.success("Attendance saved");
  }

  return (
    <SectionCard title="Mark Attendance" description={today}
      action={
        <div className="flex gap-2">
          <Select value={classId} onValueChange={setClassId}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Select class" /></SelectTrigger>
            <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.code} · {c.name}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={save} disabled={!students.length}>Save</Button>
        </div>
      }>
      {!classes.length ? <EmptyState icon={ClipboardCheck} title="No classes assigned" /> :
        students.length === 0 ? <EmptyState icon={ClipboardCheck} title="No students enrolled" desc="Ask admin to enroll students in this class." /> :
        <ul className="divide-y divide-border">
          {students.map(s => (
            <li key={s.id} className="py-3 flex items-center gap-3">
              <span className="font-medium flex-1">{s.full_name || s.email}</span>
              <Select value={marks[s.id] ?? ""} onValueChange={(v) => setMarks({ ...marks, [s.id]: v as Status })}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Mark" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="excused">Excused</SelectItem>
                </SelectContent>
              </Select>
            </li>
          ))}
        </ul>}
    </SectionCard>
  );
}
