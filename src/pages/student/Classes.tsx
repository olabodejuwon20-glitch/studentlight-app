import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
export default function StudentClasses() {
  const { school, user } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!school || !user) return;
    (async () => {
      const { data: enr } = await supabase.from("class_enrollments").select("class_id").eq("student_id", user.id);
      const ids = enr?.map(e => e.class_id) ?? [];
      if (!ids.length) return setRows([]);
      const { data } = await supabase.from("classes").select("*").in("id", ids);
      setRows(data ?? []);
    })();
  }, [school, user]);
  return (
    <SectionCard title="My Classes">
      {rows.length === 0 ? <EmptyState icon={BookOpen} title="Not enrolled in any class" /> :
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{rows.map(c => (
          <div key={c.id} className="rounded-xl border border-border p-5">
            <div className="size-10 rounded-lg bg-student/10 text-student grid place-items-center"><BookOpen className="size-5" /></div>
            <div className="mt-3 font-semibold">{c.code}</div><div className="text-sm">{c.name}</div>
          </div>
        ))}</div>}
    </SectionCard>
  );
}
