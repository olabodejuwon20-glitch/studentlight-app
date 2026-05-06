import { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
export default function Library() {
  const { school } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!school) return;
    supabase.from("library_files").select("*").eq("school_id", school.id).order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  }, [school]);
  return (
    <SectionCard title="Library">
      {rows.length === 0 ? <EmptyState icon={FileText} title="No resources yet" desc="Teachers and admins can upload files here." /> :
        <ul className="divide-y divide-border">{rows.map(f => (
          <li key={f.id} className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3"><FileText className="size-4 text-muted-foreground" /><span className="font-medium">{f.name}</span></div>
            <span className="text-xs text-muted-foreground">{f.category}</span>
          </li>
        ))}</ul>}
    </SectionCard>
  );
}
