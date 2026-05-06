import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";

export default function TeacherStudents() {
  const { school, user } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!school || !user) return;
    (async () => {
      const { data: classes } = await supabase.from("classes").select("id").eq("teacher_id", user.id);
      const ids = classes?.map(c => c.id) ?? [];
      if (!ids.length) return setRows([]);
      const { data: enr } = await supabase.from("class_enrollments").select("student_id").in("class_id", ids);
      const sids = Array.from(new Set(enr?.map(e => e.student_id) ?? []));
      if (!sids.length) return setRows([]);
      const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", sids);
      setRows(profs ?? []);
    })();
  }, [school, user]);
  return (
    <SectionCard title="My Students">
      {rows.length === 0 ? <EmptyState icon={Users} title="No students" /> :
        <ul className="divide-y divide-border">
          {rows.map(s => <li key={s.id} className="py-3 flex justify-between"><span>{s.full_name || s.email}</span><span className="text-muted-foreground text-sm">{s.email}</span></li>)}
        </ul>}
    </SectionCard>
  );
}
