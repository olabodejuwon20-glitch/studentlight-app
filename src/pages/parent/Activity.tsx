import { useEffect, useState } from "react";
import { Activity, Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";

export default function ParentActivity() {
  const { school } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!school) return;
    supabase.from("announcements").select("*").eq("school_id", school.id).order("created_at", { ascending: false }).limit(30)
      .then(({ data }) => setRows(data ?? []));
  }, [school]);
  return (
    <SectionCard title="School activity feed">
      {rows.length === 0 ? <EmptyState icon={Activity} title="Nothing posted yet" /> :
        <ul className="space-y-3">{rows.map(r => (
          <li key={r.id} className="flex gap-3 p-3 rounded-lg border border-border">
            <div className="size-9 rounded-lg bg-parent/10 grid place-items-center shrink-0"><Megaphone className="size-4 text-parent" /></div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm">{r.title}</div>
              {r.body && <div className="text-xs text-muted-foreground mt-0.5">{r.body}</div>}
              <div className="text-[11px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString()}</div>
            </div>
          </li>
        ))}</ul>}
    </SectionCard>
  );
}
