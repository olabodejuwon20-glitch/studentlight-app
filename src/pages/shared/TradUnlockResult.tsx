import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { KeyRound, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function TradUnlockResult() {
  const { resultId } = useParams<{ resultId: string }>();
  const [params] = useSearchParams();
  const batchId = params.get("batch") ?? "";

  const [serial, setSerial] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<{ serial: string; pin: string } | null>(null);

  async function redeem() {
    if (!resultId) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.rpc("trad_redeem_card", {
        _serial: serial.trim().toUpperCase(), _pin: pin.trim(), _result_id: resultId,
      });
      if (error) throw error;
      const r = data as any;
      if (r?.ok) {
        toast.success(r.already ? "Already unlocked" : `Unlocked — ${r.remaining} use(s) remaining`);
        window.location.href = `./`;
      } else {
        toast.error(r?.error ?? "Could not redeem card");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Redeem failed");
    } finally { setBusy(false); }
  }

  async function buy() {
    if (!batchId) { toast.error("No batch selected"); return; }
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("trad-card-checkout", {
        body: { batch_id: batchId, callback_url: window.location.href },
      });
      if (error) throw error;
      const url = (data as any)?.authorization_url;
      if (url) window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message ?? "Checkout failed");
    } finally { setBusy(false); }
  }

  // After Paystack returns, ?reference=... finalises the purchase.
  const ref = params.get("reference") || params.get("trxref");
  if (ref && !revealed) {
    supabase.functions.invoke("trad-card-verify", { body: { reference: ref } })
      .then(({ data, error }) => {
        if (error) { toast.error(error.message); return; }
        const d = data as any;
        if (d?.ok && d.pin) setRevealed({ serial: d.serial, pin: d.pin });
        else if (d?.already) toast.info("Purchase already processed");
      });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Unlock Result" description="Enter a scratch-card serial and PIN, or buy a new card." />

      {revealed && (
        <SectionCard title="Your new card" description="Save these credentials — they are shown only once.">
          <div className="rounded-xl border bg-card p-4 space-y-2">
            <div><span className="text-xs text-muted-foreground">Serial</span><div className="font-mono text-lg">{revealed.serial}</div></div>
            <div><span className="text-xs text-muted-foreground">PIN</span><div className="font-mono text-lg">{revealed.pin}</div></div>
          </div>
        </SectionCard>
      )}

      <SectionCard title="Enter card" description="Already have a card? Enter the serial and PIN.">
        <div className="grid sm:grid-cols-2 gap-3 max-w-xl">
          <div><Label>Serial</Label><Input value={serial} onChange={e => setSerial(e.target.value)} placeholder="LS-XXXX-XXXX" /></div>
          <div><Label>PIN</Label><Input value={pin} onChange={e => setPin(e.target.value)} placeholder="12 digits" /></div>
        </div>
        <Button className="mt-3" onClick={redeem} disabled={busy || !serial || !pin}>
          <KeyRound className="size-4" /> Unlock
        </Button>
      </SectionCard>

      {batchId && (
        <SectionCard title="Buy a card" description="Purchase a new scratch card online via Paystack.">
          <Button onClick={buy} disabled={busy}>
            <ShoppingCart className="size-4" /> Buy card
          </Button>
        </SectionCard>
      )}
    </div>
  );
}