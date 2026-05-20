import { useEffect, useState } from "react";
import { Award, AlertTriangle, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";

const ICONS: Record<string, any> = { commendation: Award, incident: AlertTriangle, note: MessageSquare };
const TONES: Record<string, string> = { commendation: "bg-success/15 text-success", incident: "bg-destructive/15 text-destructive", note: "bg-info/15 text-info" };

export default function ParentBehavior() {
  const { school, user } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  const [profMap, setProfMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!school || !user) return;
    (async () => {
      const { data } = await supabase.from("behavior_notes").select("*").eq("school_id", school.id).order("created_at", { ascending: false });
      setRows(data ?? []);
      const sids = Array.from(new Set((data ?? []).map(r => r.student_id)));
      if (sids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", sids);
        const m: Record<string, string> = {}; profs?.forEach(p => m[p.id] = p.full_name || p.email || p.id.slice(0,8));
        setProfMap(m);
      }
    })();
  }, [school, user]);

  return (
    <SectionCard title="Behavior & Conduct" description="Commendations, incidents and notes from teachers">
      {rows.length === 0 ? <EmptyState icon={MessageSquare} title="No notes yet" /> :
        <ul className="space-y-2">
          {rows.map(r => {
            const Icon = ICONS[r.type] ?? MessageSquare;
            return (
              <li key={r.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                <div className={`size-9 rounded-lg grid place-items-center ${TONES[r.type] ?? TONES.note}`}><Icon className="size-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{profMap[r.student_id]}</span>
                    <Badge variant="outline" className="text-[10px] capitalize">{r.type}</Badge>
                    <Badge variant="outline" className="text-[10px] capitalize">{r.severity}</Badge>
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