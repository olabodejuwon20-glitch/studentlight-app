import { useEffect, useState } from "react";
import { Award, AlertTriangle, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";

const ICONS: Record<string, any> = { commendation: Award, incident: AlertTriangle, note: MessageSquare };
const TONES: Record<string, string> = { commendation: "bg-success/15 text-success", incident: "bg-destructive/15 text-destructive", note: "bg-info/15 text-info" };

export default function StudentBehavior() {
  const { school, user } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!school || !user) return;
    supabase.from("behavior_notes").select("*").eq("school_id", school.id).eq("student_id", user.id).order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  }, [school, user]);
  return (
    <SectionCard title="My conduct" description="Commendations, incidents, and notes from your teachers">
      {rows.length === 0 ? <EmptyState icon={MessageSquare} title="No notes yet" /> :
        <ul className="space-y-2">
          {rows.map(r => {
            const Icon = ICONS[r.type] ?? MessageSquare;
            return (
              <li key={r.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                <div className={`size-9 rounded-lg grid place-items-center ${TONES[r.type] ?? TONES.note}`}><Icon className="size-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[10px] capitalize">{r.type}</Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">{r.severity}</Badge>
                    {r.category && <span className="capitalize">{r.category}</span>}
                    <span className="ml-auto">{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm mt-1">{r.note}</p>
                </div>
              </li>
            );
          })}
        </ul>}
    </SectionCard>
  );
}