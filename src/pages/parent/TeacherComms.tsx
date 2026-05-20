import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";

export default function ParentTeacherComms() {
  const { school, user } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  const [profMap, setProfMap] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!school || !user) return;
    (async () => {
      const { data } = await supabase.from("parent_comms").select("*").eq("school_id", school.id).eq("parent_id", user.id).order("created_at", { ascending: false });
      setRows(data ?? []);
      const ids = Array.from(new Set((data ?? []).flatMap(r => [r.student_id, r.teacher_id])));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);
        const m: Record<string, string> = {}; profs?.forEach(p => m[p.id] = p.full_name || p.email || p.id.slice(0,8));
        setProfMap(m);
      }
      const unread = (data ?? []).filter(r => !r.read_at);
      if (unread.length) await supabase.from("parent_comms").update({ read_at: new Date().toISOString() }).in("id", unread.map(u => u.id));
    })();
  }, [school, user]);

  return (
    <SectionCard title="Teacher Messages" description="Updates from your child's teachers">
      {rows.length === 0 ? <EmptyState icon={Mail} title="No messages yet" /> :
        <ul className="divide-y divide-border">
          {rows.map(m => (
            <li key={m.id} className="py-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                <span className="font-medium text-foreground">{m.subject}</span>
                <Badge variant="outline" className="text-[10px]">From: {profMap[m.teacher_id]}</Badge>
                <Badge variant="secondary" className="text-[10px]">re: {profMap[m.student_id]}</Badge>
                <span className="ml-auto">{new Date(m.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm mt-1 whitespace-pre-wrap">{m.body}</p>
            </li>
          ))}
        </ul>}
    </SectionCard>
  );
}