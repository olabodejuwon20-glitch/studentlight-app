import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";

export default function TeacherClasses() {
  const { school, user } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!school || !user) return;
    supabase.from("classes").select("*").eq("school_id", school.id).eq("teacher_id", user.id).then(({ data }) => setRows(data ?? []));
  }, [school, user]);
  return (
    <SectionCard title="My Classes">
      {rows.length === 0 ? <EmptyState icon={BookOpen} title="No classes" /> :
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map(c => (
            <div key={c.id} className="rounded-xl border border-border p-5">
              <div className="size-10 rounded-lg bg-teacher/10 text-teacher grid place-items-center"><BookOpen className="size-5" /></div>
              <div className="mt-3 font-semibold">{c.code}</div>
              <div className="text-sm">{c.name}</div>
            </div>
          ))}
        </div>}
    </SectionCard>
  );
}
