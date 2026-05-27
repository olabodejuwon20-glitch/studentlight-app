import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { naira, startPaystackCheckout, toKobo } from "@/lib/payments";
import { toast } from "sonner";
import { CreditCard } from "lucide-react";

export function PayNowButton({ invoice }: { invoice: any }) {
  const outstanding = invoice.amount_due_kobo - invoice.amount_paid_kobo;
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState((outstanding / 100).toString());
  const [loading, setLoading] = useState(false);

  const pay = async () => {
    const kobo = toKobo(amount);
    if (kobo < 100) return toast.error("Amount too small");
    if (kobo > outstanding) return toast.error("Exceeds outstanding");
    setLoading(true);
    try {
      const r = await startPaystackCheckout(invoice.id, kobo);
      window.location.href = r.authorization_url;
    } catch (e: any) {
      toast.error(e?.message ?? "Online payment not available yet. Use bank transfer instead.");
      setLoading(false);
    }
  };

  if (outstanding <= 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><CreditCard className="w-4 h-4 mr-1" />Pay now</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Pay invoice</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">Outstanding: <span className="font-semibold text-foreground">{naira(outstanding)}</span></div>
          <div><Label>Amount to pay (₦)</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} /></div>
          <p className="text-xs text-muted-foreground">You'll be redirected to Paystack to complete the payment securely.</p>
        </div>
        <DialogFooter><Button onClick={pay} disabled={loading}>{loading ? "Redirecting…" : `Pay ${naira(toKobo(amount))}`}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}