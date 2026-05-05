import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { fees } from "@/data/mock";
import { toast } from "sonner";

export default function ParentFees() {
  return (
    <SectionCard title="Fees & Payments" description="Track all invoices">
      <table className="w-full text-sm">
        <thead><tr className="text-xs uppercase text-muted-foreground border-b border-border">
          <th className="text-left font-medium py-3 pr-4">Description</th><th className="text-left font-medium py-3 pr-4">Amount</th>
          <th className="text-left font-medium py-3 pr-4">Status</th><th className="text-left font-medium py-3 pr-4">Due Date</th>
          <th className="text-left font-medium py-3 pr-4">Action</th>
        </tr></thead>
        <tbody>
          {fees.map((f, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              <td className="py-3 pr-4 font-medium">{f.desc}</td>
              <td className="py-3 pr-4">{f.amount}</td>
              <td className="py-3 pr-4">
                <Badge variant="outline" className={f.status === "Paid" ? "border-success/30 bg-success/10 text-success" : "border-warning/30 bg-warning/10 text-warning"}>{f.status}</Badge>
              </td>
              <td className="py-3 pr-4 text-muted-foreground">{f.due}</td>
              <td className="py-3 pr-4">{f.status === "Pending" ? <Button size="sm" onClick={() => toast.success("Redirecting to payment...")}>Pay now</Button> : <Button size="sm" variant="ghost">Receipt</Button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  );
}
