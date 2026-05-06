import { useEffect, useState } from "react";
import { Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
export default function ParentActivity() {
  const { school, user } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!school || !user) return;
    supabase.from("announcements").select("*").eq("school_id", school.id).then(({ data }) => setRows(data ?? []));
  }, [school, user]);
  return (
    <SectionCard title="Activity">
      {rows.length === 0 ? <EmptyState icon={Activity} title="Nothing yet" /> :
        <ul className="divide-y divide-border">{rows.map((r:any) => (
          <li key={r.id} className="py-3 text-sm flex justify-between"><span>{r.description || r.subject || r.title || r.body || r.id.slice(0,8)}</span><span className="text-xs text-muted-foreground">{r.created_at && new Date(r.created_at).toLocaleDateString()}</span></li>
        ))}</ul>}
    </SectionCard>
  );
}
