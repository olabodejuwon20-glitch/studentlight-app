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

    const { invoice_id, amount_kobo, method, notes, proof_url } = await req.json();
    if (!invoice_id || !amount_kobo || !method) return json({ error: "missing_fields" }, 400);
    if (!["cash", "bank_transfer", "pos", "waiver"].includes(method)) return json({ error: "invalid_method" }, 400);

    const { data: invoice } = await supabase.from("school_invoices").select("id, school_id, student_id, currency").eq("id", invoice_id).maybeSingle();
    if (!invoice) return json({ error: "invoice_not_found" }, 404);

    const { data: isAdmin } = await supabase.rpc("is_school_admin", { _school: invoice.school_id, _user: user.id });
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: payment, error: insErr } = await admin.from("school_payments").insert({
      invoice_id, school_id: invoice.school_id, student_id: invoice.student_id,
      payer_user_id: user.id, recorded_by: user.id,
      amount_kobo, currency: invoice.currency || "NGN",
      method, status: "successful", paid_at: new Date().toISOString(),
      provider_reference: `offline_${invoice.id.slice(0, 8)}_${Date.now()}`,
      proof_url, notes,
    }).select("id").single();
    if (insErr) { console.error("[payments-record-offline insert]", insErr); return json({ error: "An internal error occurred" }, 500); }

    const { error: applyErr } = await admin.rpc("apply_payment", { _payment_id: payment.id });
    if (applyErr) { console.error("[payments-record-offline apply]", applyErr); return json({ error: "An internal error occurred" }, 500); }

    return json({ ok: true, payment_id: payment.id });
  } catch (e) {
    console.error("[payments-record-offline]", e);
    return json({ error: "An internal error occurred" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}