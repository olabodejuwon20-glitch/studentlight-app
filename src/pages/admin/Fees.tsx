import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";

export default function AdminFees() {
  const { school } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!school) return;
    supabase.from("fees").select("*").eq("school_id", school.id).order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setRows(data ?? []));
  }, [school]);

  const total = rows.reduce((s, r) => s + Number(r.amount), 0);
  const paid = rows.filter(r => r.status === "paid").reduce((s, r) => s + Number(r.amount), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-card border border-border"><div className="text-xs text-muted-foreground">Total billed</div><div className="text-2xl font-display font-bold mt-1">₦{total.toLocaleString()}</div></div>
        <div className="p-5 rounded-xl bg-card border border-border"><div className="text-xs text-muted-foreground">Collected</div><div className="text-2xl font-display font-bold mt-1 text-success">₦{paid.toLocaleString()}</div></div>
        <div className="p-5 rounded-xl bg-card border border-border"><div className="text-xs text-muted-foreground">Outstanding</div><div className="text-2xl font-display font-bold mt-1 text-warning">₦{(total - paid).toLocaleString()}</div></div>
      </div>
      <SectionCard title="Recent fees">
        {rows.length === 0
          ? <EmptyState icon={Wallet} title="No fees yet" desc="Fee invoices will show up here." />
          : <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground"><tr className="border-b border-border">
                <th className="text-left py-2">Description</th><th className="text-right">Amount</th><th className="text-left">Status</th><th className="text-left">Due</th></tr></thead>
              <tbody>{rows.map(r => (
                <tr key={r.id} className="border-b border-border last:border-0">
                  <td className="py-3">{r.description}</td>
                  <td className="text-right tabular-nums">₦{Number(r.amount).toLocaleString()}</td>
                  <td><span className={`text-xs px-2 py-0.5 rounded-full ${r.status === "paid" ? "bg-success/10 text-success" : "bg-warning/10 text-warning"}`}>{r.status}</span></td>
                  <td className="text-muted-foreground">{r.due_date || "—"}</td>
                </tr>
              ))}</tbody>
            </table></div>}
      </SectionCard>
    </div>
  );
}
