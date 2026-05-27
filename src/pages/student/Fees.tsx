import { useEffect, useState } from "react";
import { Wallet, Banknote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/StatCard";
import { PayNowButton } from "@/components/payments/PayNowButton";
import { SubmitProofButton } from "@/components/payments/SubmitProofButton";
import { ReceiptLink } from "@/components/payments/ReceiptLink";
import { invoiceStatusColor, naira } from "@/lib/payments";

export default function StudentFees() {
  const { school, user } = useSchool();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [types, setTypes] = useState<Record<string, string>>({});
  const [bank, setBank] = useState<any>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!school || !user) return;
    (async () => {
      const [i, p, t, s] = await Promise.all([
        supabase.from("school_invoices").select("*").eq("school_id", school.id).eq("student_id", user.id).order("issued_at", { ascending: false }),
        supabase.from("school_payments").select("*").eq("school_id", school.id).eq("student_id", user.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("payment_types").select("id,name").eq("school_id", school.id),
        supabase.from("school_payment_settings").select("*").eq("school_id", school.id).maybeSingle(),
      ]);
      setInvoices(i.data ?? []);
      setPayments(p.data ?? []);
      setTypes(Object.fromEntries((t.data ?? []).map((r: any) => [r.id, r.name])));
      setBank(s.data);
    })();
  }, [school, user, reloadKey]);
  const reload = () => setReloadKey(k => k + 1);

  const outstanding = invoices.reduce((s, r) => s + (r.amount_due_kobo - r.amount_paid_kobo), 0);
  const paid = invoices.reduce((s, r) => s + r.amount_paid_kobo, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <StatCard label="Outstanding" value={naira(outstanding)} icon={Wallet} tone="warning" />
        <StatCard label="Paid" value={naira(paid)} icon={Banknote} tone="success" />
      </div>

      <SectionCard title="My invoices">
        {invoices.length === 0 ? <EmptyState icon={Wallet} title="No invoices yet" /> :
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b border-border"><tr>
              <th className="text-left py-2">Description</th><th className="text-right">Due</th><th className="text-right">Paid</th><th className="text-left">Status</th><th></th>
            </tr></thead>
            <tbody>{invoices.map(r => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="py-3">{types[r.payment_type_id] || r.notes || "Invoice"}{r.due_date && <div className="text-xs text-muted-foreground">Due {new Date(r.due_date).toLocaleDateString()}</div>}</td>
                <td className="text-right tabular-nums">{naira(r.amount_due_kobo)}</td>
                <td className="text-right tabular-nums">{naira(r.amount_paid_kobo)}</td>
                <td><Badge variant="outline" className={invoiceStatusColor(r.status)}>{r.status}</Badge></td>
                <td className="text-right">
                  <div className="flex gap-2 justify-end">
                    <PayNowButton invoice={r} />
                    <SubmitProofButton invoice={r} onSubmitted={reload} />
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table></div>}
      </SectionCard>

      {bank?.bank_name && (
        <SectionCard title="Bank transfer details" description="Use these details if you prefer to pay by bank transfer.">
          <div className="text-sm grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div><div className="text-muted-foreground text-xs">Bank</div>{bank.bank_name}</div>
            <div><div className="text-muted-foreground text-xs">Account number</div><span className="font-mono">{bank.account_number}</span></div>
            <div><div className="text-muted-foreground text-xs">Account name</div>{bank.account_name}</div>
          </div>
        </SectionCard>
      )}

      {payments.length > 0 && (
        <SectionCard title="Payment history">
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground border-b border-border"><tr>
              <th className="text-left py-2">Date</th><th className="text-left">Method</th><th className="text-right">Amount</th><th className="text-left">Status</th><th className="text-left">Receipt</th>
            </tr></thead>
            <tbody>{payments.map(p => (
              <tr key={p.id} className="border-b border-border last:border-0">
                <td className="py-3 text-muted-foreground">{new Date(p.paid_at || p.created_at).toLocaleDateString()}</td>
                <td className="capitalize">{p.method.replace("_", " ")}</td>
                <td className="text-right tabular-nums">{naira(p.amount_kobo)}</td>
                <td><Badge variant="outline" className={p.status === "successful" ? "bg-success/10 text-success border-success/30" : p.status === "failed" ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-warning/10 text-warning border-warning/30"}>{p.status === "initiated" ? "pending review" : p.status}</Badge></td>
                <td><ReceiptLink path={p.proof_url} /></td>
              </tr>
            ))}</tbody>
          </table></div>
        </SectionCard>
      )}
    </div>
  );
}