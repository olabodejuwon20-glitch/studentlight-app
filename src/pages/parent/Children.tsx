import { useEffect, useState } from "react";
import { UserSquare2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { publicContact, publicInitials } from "@/lib/identity";

export default function ParentChildren() {
  const { school, user } = useSchool();
  const [kids, setKids] = useState<any[]>([]);

  useEffect(() => {
    if (!school || !user) return;
    (async () => {
      const { data: links } = await supabase.from("parent_links").select("student_user_id").eq("school_id", school.id).eq("parent_user_id", user.id);
      const ids = (links ?? []).map(l => l.student_user_id);
      if (!ids.length) return setKids([]);
      const { data: profs } = await supabase.from("profiles").select("id,full_name,email,phone,photo_url,dob").in("id", ids);
      // attendance & avg score per child
      const enriched = await Promise.all((profs ?? []).map(async p => {
        const [{ data: att }, { data: rs }] = await Promise.all([
          supabase.from("attendance").select("status").eq("student_id", p.id),
          supabase.from("results").select("score").eq("student_id", p.id),
        ]);
        const tot = att?.length ?? 0;
        const pct = tot ? Math.round(((att!.filter(a => a.status === "present").length) / tot) * 100) : 0;
        const avg = rs?.length ? Math.round(rs.reduce((s,r)=>s+Number(r.score),0)/rs.length) : 0;
        return { ...p, attPct: pct, avg };
      }));
      setKids(enriched);
    })();
  }, [school, user]);

  return (
    <SectionCard title="My children">
      {kids.length === 0 ? <EmptyState icon={UserSquare2} title="No children linked" desc="Ask the school admin to link your children." /> :
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{kids.map(k => (
          <div key={k.id} className="rounded-xl border border-border p-5 bg-card">
            <div className="flex items-center gap-3">
              <Avatar className="size-14">{k.photo_url && <AvatarImage src={k.photo_url} />}<AvatarFallback className="bg-parent text-white">{publicInitials(k)}</AvatarFallback></Avatar>
              <div className="min-w-0"><div className="font-semibold truncate">{k.full_name || "Your child"}</div><div className="text-xs text-muted-foreground truncate">{publicContact(k) || "—"}</div></div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-4 text-center">
              <div className="rounded-lg bg-muted/50 p-3"><div className="text-xs text-muted-foreground">Attendance</div><div className="font-bold">{k.attPct}%</div></div>
              <div className="rounded-lg bg-muted/50 p-3"><div className="text-xs text-muted-foreground">Average</div><div className="font-bold">{k.avg ? `${k.avg}%` : "—"}</div></div>
            </div>
          </div>
        ))}</div>}
    </SectionCard>
  );
}
