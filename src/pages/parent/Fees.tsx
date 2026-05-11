import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";

export default function ParentFees() {
  const { school, user } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  const [kids, setKids] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!school || !user) return;
    (async () => {
      const { data: links } = await supabase.from("parent_links").select("student_user_id").eq("school_id", school.id).eq("parent_user_id", user.id);
      const ids = (links ?? []).map(l => l.student_user_id);
      if (!ids.length) return;
      const [{ data: profs }, { data: fees }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email").in("id", ids),
        supabase.from("fees").select("*").eq("school_id", school.id).in("student_id", ids).order("due_date"),
      ]);
      setKids(Object.fromEntries((profs ?? []).map(p => [p.id, p.full_name || p.email || "?"])));
      setRows(fees ?? []);
    })();
  }, [school, user]);

  const outstanding = rows.filter(r => r.status !== "paid").reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="space-y-6">
      <SectionCard title="Outstanding balance" description="Sum of all unpaid fees across your children">
        <div className="text-3xl font-display font-bold">₦{outstanding.toLocaleString()}</div>
      </SectionCard>
      <SectionCard title="All fees">
        {rows.length === 0 ? <EmptyState icon={Wallet} title="No fees recorded" /> :
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b border-border"><tr><th className="text-left py-2">Child</th><th className="text-left">Description</th><th className="text-right">Amount</th><th className="text-left">Due</th><th>Status</th></tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="py-3 font-medium">{kids[r.student_id] || "—"}</td>
                <td>{r.description}</td>
                <td className="text-right tabular-nums">₦{Number(r.amount).toLocaleString()}</td>
                <td className="text-muted-foreground">{r.due_date ? new Date(r.due_date).toLocaleDateString() : "—"}</td>
                <td className="text-center"><Badge variant="outline" className={r.status === "paid" ? "bg-success/10 text-success border-success/30" : "bg-warning/10 text-warning border-warning/30"}>{r.status}</Badge></td>
              </tr>
            ))}</tbody>
          </table></div>}
      </SectionCard>
    </div>
  );
}
