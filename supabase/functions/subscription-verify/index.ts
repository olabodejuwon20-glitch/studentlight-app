import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { paystackVerify } from "../_shared/paystack.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
function json(b: unknown, s = 200) { return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } }); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = new URL(req.url);
    const reference = url.searchParams.get("reference") || (await req.json().catch(() => ({}))).reference;
    if (!reference) return json({ error: "missing_reference" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: inv } = await admin.from("invoices").select("id, status, school_id, plan").eq("paystack_reference", reference).maybeSingle();
    if (!inv) return json({ error: "invoice_not_found" }, 404);
    if (inv.status === "paid") return json({ ok: true, status: "paid", invoice_id: inv.id, already: true });

    const v = await paystackVerify(reference);
    if (v.status !== "success") return json({ ok: false, status: v.status });

    const { error: rpcErr } = await admin.rpc("apply_subscription_payment", { _invoice_id: inv.id, _reference: reference, _method: "paystack" });
    if (rpcErr) {
      console.error("[subscription-verify] apply_failed", rpcErr);
      return json({ error: "apply_failed" }, 500);
    }
    return json({ ok: true, status: "paid", invoice_id: inv.id });
  } catch (e) {
    console.error("[subscription-verify]", e);
    return json({ error: "internal_error" }, 500);
  }
});