import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function AdminStudents() {
  const { school } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!school) return;
    (async () => {
      const { data: m } = await supabase.from("memberships").select("user_id,created_at").eq("school_id", school.id).eq("role", "student");
      if (!m?.length) return setRows([]);
      const { data: profiles } = await supabase.from("profiles").select("id,full_name,email").in("id", m.map(x => x.user_id));
      const byId: Record<string, any> = {}; profiles?.forEach(p => byId[p.id] = p);
      setRows(m.map(x => ({ ...x, ...byId[x.user_id] })));
    })();
  }, [school]);
  return (
    <SectionCard title="Students" description={`${rows.length} enrolled`}>
      {rows.length === 0
        ? <EmptyState icon={Users} title="No students yet" desc="Share a student invite code from the Invites page." />
        : <table className="w-full text-sm">
            <thead><tr className="text-xs uppercase text-muted-foreground border-b border-border">
              <th className="text-left font-medium py-3 pr-4">Name</th>
              <th className="text-left font-medium py-3 pr-4">Email</th>
              <th className="text-left font-medium py-3 pr-4">Joined</th>
            </tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.user_id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="py-3 pr-4"><div className="flex items-center gap-3">
                    <Avatar className="size-8"><AvatarFallback className="text-xs bg-student/15 text-student">{(r.full_name||r.email||"?").slice(0,2).toUpperCase()}</AvatarFallback></Avatar>
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
