import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/StatCard";

export default function StudentFees() {
  const { school, user } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!school || !user) return;
    supabase.from("fees").select("*").eq("school_id", school.id).eq("student_id", user.id).order("due_date").then(({ data }) => setRows(data ?? []));
  }, [school, user]);
  const outstanding = rows.filter(r => r.status !== "paid").reduce((s, r) => s + Number(r.amount), 0);
  const paid = rows.filter(r => r.status === "paid").reduce((s, r) => s + Number(r.amount), 0);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Outstanding" value={`₦${outstanding.toLocaleString()}`} icon={Wallet} tone="warning" />
        <StatCard label="Paid" value={`₦${paid.toLocaleString()}`} icon={Wallet} tone="success" />
      </div>
      <SectionCard title="My fees">
        {rows.length === 0 ? <EmptyState icon={Wallet} title="No fees recorded" /> :
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b border-border"><tr><th className="text-left py-2">Description</th><th className="text-right">Amount</th><th className="text-left">Due</th><th>Status</th></tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="py-3">{r.description}</td>
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