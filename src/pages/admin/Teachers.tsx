import { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function AdminTeachers() {
  const { school } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!school) return;
    (async () => {
      const { data: m } = await supabase.from("memberships").select("user_id,created_at").eq("school_id", school.id).eq("role", "teacher");
      if (!m?.length) return setRows([]);
      const { data: profiles } = await supabase.from("profiles").select("id,full_name,email").in("id", m.map(x => x.user_id));
      const byId: Record<string, any> = {}; profiles?.forEach(p => byId[p.id] = p);
      setRows(m.map(x => ({ ...x, ...byId[x.user_id] })));
    })();
  }, [school]);
  return (
    <SectionCard title="Teachers" description={`${rows.length} active`}>
      {rows.length === 0
        ? <EmptyState icon={GraduationCap} title="No teachers yet" desc="Generate a teacher invite code to onboard staff." />
        : <table className="w-full text-sm">
            <thead><tr className="text-xs uppercase text-muted-foreground border-b border-border">
              <th className="text-left font-medium py-3 pr-4">Name</th>
              <th className="text-left font-medium py-3 pr-4">Email</th>
              <th className="text-left font-medium py-3 pr-4">Joined</th>
            </tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.user_id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4"><div className="flex items-center gap-3">
                    <Avatar className="size-8"><AvatarFallback className="text-xs bg-teacher/15 text-teacher">{(r.full_name||r.email||"?").slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
                    <span className="font-medium">{r.full_name || "—"}</span>
                  </div></td>
                  <td className="py-3 pr-4 text-muted-foreground">{r.email}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>}
    </SectionCard>
  );
}
