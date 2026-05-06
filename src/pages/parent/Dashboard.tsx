import { useEffect, useState } from "react";
import { UserSquare2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
export default function ParentDashboard() {
  const { school, user } = useSchool();
  const [children, setChildren] = useState<any[]>([]);
  useEffect(() => {
    if (!school || !user) return;
    (async () => {
      const { data: links } = await supabase.from("parent_links").select("student_user_id").eq("school_id", school.id).eq("parent_user_id", user.id);
      const ids = links?.map(l => l.student_user_id) ?? [];
      if (!ids.length) return setChildren([]);
      const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);
      setChildren(profs ?? []);
    })();
  }, [school, user]);
  return (
    <SectionCard title="My Children">
      {children.length === 0 ? <EmptyState icon={UserSquare2} title="No children linked" desc="Ask the school admin to link your account to your children." /> :
        <div className="grid sm:grid-cols-2 gap-4">{children.map(c => (
          <div key={c.id} className="rounded-xl border border-border p-5">
            <div className="font-semibold">{c.full_name || c.email}</div><div className="text-xs text-muted-foreground">{c.email}</div>
          </div>
        ))}</div>}
    </SectionCard>
  );
}
