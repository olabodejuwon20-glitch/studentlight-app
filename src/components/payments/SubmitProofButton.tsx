import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { naira, submitPaymentProof, toKobo } from "@/lib/payments";
import { toast } from "sonner";
import { UploadCloud } from "lucide-react";

export function SubmitProofButton({ invoice, onSubmitted }: { invoice: any; onSubmitted?: () => void }) {
  const outstanding = invoice.amount_due_kobo - invoice.amount_paid_kobo;
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState((outstanding / 100).toString());
  const [method, setMethod] = useState<"bank_transfer" | "cash" | "pos">("bank_transfer");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  if (outstanding <= 0) return null;

  const submit = async () => {
    const kobo = toKobo(amount);
    if (kobo < 100) return toast.error("Amount too small");
    if (kobo > outstanding) return toast.error("Exceeds outstanding");
    if (!file) return toast.error("Attach a receipt image or PDF");
    if (file.size > 8 * 1024 * 1024) return toast.error("File too large (max 8MB)");
    if (!/^(image\/|application\/pdf)/.test(file.type)) return toast.error("Only images or PDF allowed");
    setLoading(true);
    try {
      await submitPaymentProof({ invoice, amount_kobo: kobo, method, file, notes });
      toast.success("Proof submitted. Awaiting admin verification.");
      setOpen(false);
      setFile(null);
      onSubmitted?.();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to submit proof");
    } finally { setLoading(false); }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><UploadCloud className="w-4 h-4 mr-1" />Upload proof</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Submit payment proof</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">Outstanding: <span className="font-semibold text-foreground">{naira(outstanding)}</span></div>
          <div><Label>Amount paid (₦)</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} /></div>
          <div>
            <Label>Method</Label>
            <Select value={method} onValueChange={(v) => setMethod(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="pos">POS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Receipt (image or PDF)</Label>
            <Input type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div><Label>Notes (optional)</Label><Textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reference, sender name, etc." /></div>
          <p className="text-xs text-muted-foreground">Your school admin will verify the receipt before the payment is applied to your invoice.</p>
        </div>
        <DialogFooter><Button onClick={submit} disabled={loading || !file}>{loading ? "Uploading…" : "Submit proof"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}