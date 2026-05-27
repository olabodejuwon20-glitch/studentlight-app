import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);

    const { invoice_id, amount_kobo } = await req.json();
    if (!invoice_id || !amount_kobo || amount_kobo < 100) return json({ error: "invalid_amount" }, 400);

    const { data: invoice, error: invErr } = await supabase
      .from("school_invoices")
      .select("id, school_id, student_id, amount_due_kobo, amount_paid_kobo, status, currency")
      .eq("id", invoice_id)
      .maybeSingle();
    if (invErr || !invoice) return json({ error: "invoice_not_found" }, 404);
    if (invoice.status === "paid" || invoice.status === "cancelled") return json({ error: "invoice_closed" }, 400);
    const outstanding = invoice.amount_due_kobo - invoice.amount_paid_kobo;
    if (amount_kobo > outstanding) return json({ error: "amount_exceeds_outstanding" }, 400);

    const paystackKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!paystackKey) return json({ error: "paystack_not_configured", message: "Online payments are not yet enabled for this platform." }, 503);

    const reference = `ls_${invoice.id.slice(0, 8)}_${Date.now()}`;
    const callback_url = `${new URL(req.url).origin.replace(/\/functions\/.*/, "")}/payments/callback?ref=${reference}`;

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${paystackKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: user.email,
        amount: amount_kobo,
        currency: invoice.currency || "NGN",
        reference,
        metadata: { invoice_id: invoice.id, school_id: invoice.school_id, student_id: invoice.student_id, payer_user_id: user.id },
      }),
    });
    const paystackData = await paystackRes.json();
    if (!paystackData.status) return json({ error: "paystack_init_failed", details: paystackData }, 502);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await admin.from("school_payments").insert({
      invoice_id: invoice.id,
      school_id: invoice.school_id,
      student_id: invoice.student_id,
      payer_user_id: user.id,
      amount_kobo,
      currency: invoice.currency || "NGN",
      method: "paystack",
      status: "initiated",
      provider_reference: reference,
    });

    return json({ authorization_url: paystackData.data.authorization_url, reference });
  } catch (e) {
    console.error("[payments-checkout]", e);
    return json({ error: "An internal error occurred" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}