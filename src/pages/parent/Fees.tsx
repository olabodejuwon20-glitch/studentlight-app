import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { PayNowButton } from "@/components/payments/PayNowButton";
import { invoiceStatusColor, naira } from "@/lib/payments";

export default function ParentFees() {
  const { school, user } = useSchool();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [kids, setKids] = useState<Record<string, string>>({});
  const [types, setTypes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!school || !user) return;
    (async () => {
      const { data: links } = await supabase.from("parent_links").select("student_user_id").eq("school_id", school.id).eq("parent_user_id", user.id);
      const ids = (links ?? []).map(l => l.student_user_id);
      if (!ids.length) return;
      const [{ data: profs }, { data: inv }, { data: t }] = await Promise.all([
        supabase.from("profiles").select("id,full_name,email").in("id", ids),
        supabase.from("school_invoices").select("*").eq("school_id", school.id).in("student_id", ids).order("issued_at", { ascending: false }),
        supabase.from("payment_types").select("id,name").eq("school_id", school.id),
      ]);
      setKids(Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name || p.email || "?"])));
      setInvoices(inv ?? []);
      setTypes(Object.fromEntries((t ?? []).map((r: any) => [r.id, r.name])));
    })();
  }, [school, user]);

  const outstanding = invoices.reduce((s, r) => s + (r.amount_due_kobo - r.amount_paid_kobo), 0);

  return (
    <div className="space-y-6">
      <SectionCard title="Outstanding balance" description="Sum of all unpaid invoices across your children">
        <div className="text-3xl font-display font-bold">{naira(outstanding)}</div>
      </SectionCard>
      <SectionCard title="All invoices">
        {invoices.length === 0 ? <EmptyState icon={Wallet} title="No invoices yet" /> :
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b border-border"><tr>
              <th className="text-left py-2">Child</th><th className="text-left">Description</th>
              <th className="text-right">Due</th><th className="text-right">Paid</th>
              <th className="text-left">Status</th><th></th>
            </tr></thead>
            <tbody>{invoices.map(r => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="py-3 font-medium">{kids[r.student_id] || "—"}</td>
                <td>{types[r.payment_type_id] || r.notes || "Invoice"}{r.due_date && <div className="text-xs text-muted-foreground">Due {new Date(r.due_date).toLocaleDateString()}</div>}</td>
                <td className="text-right tabular-nums">{naira(r.amount_due_kobo)}</td>
                <td className="text-right tabular-nums">{naira(r.amount_paid_kobo)}</td>
                <td><Badge variant="outline" className={invoiceStatusColor(r.status)}>{r.status}</Badge></td>
                <td className="text-right"><PayNowButton invoice={r} /></td>
              </tr>
            ))}</tbody>
          </table></div>}
      </SectionCard>
    </div>
  );
}
