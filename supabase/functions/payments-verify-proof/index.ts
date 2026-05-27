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

    const { payment_id, approve, reason } = await req.json();
    if (!payment_id || typeof approve !== "boolean") return json({ error: "missing_fields" }, 400);

    const { data: payment } = await supabase.from("school_payments")
      .select("id, school_id, status").eq("id", payment_id).maybeSingle();
    if (!payment) return json({ error: "payment_not_found" }, 404);
    if (payment.status !== "initiated") return json({ error: "already_processed" }, 400);

    const { data: isAdmin } = await supabase.rpc("is_school_admin", { _school: payment.school_id, _user: user.id });
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (approve) {
      const { error: upErr } = await admin.from("school_payments").update({
        status: "successful", paid_at: new Date().toISOString(), recorded_by: user.id,
      }).eq("id", payment_id);
      if (upErr) { console.error("[verify-proof update]", upErr); return json({ error: "An internal error occurred" }, 500); }
      const { error: applyErr } = await admin.rpc("apply_payment", { _payment_id: payment_id });
      if (applyErr) { console.error("[verify-proof apply]", applyErr); return json({ error: "An internal error occurred" }, 500); }
      return json({ ok: true, status: "successful" });
    } else {
      const { error: upErr } = await admin.from("school_payments").update({
        status: "failed", recorded_by: user.id,
        notes: reason ? `Rejected: ${reason}` : "Rejected",
      }).eq("id", payment_id);
      if (upErr) { console.error("[verify-proof reject]", upErr); return json({ error: "An internal error occurred" }, 500); }
      return json({ ok: true, status: "failed" });
    }
  } catch (e) {
    console.error("[payments-verify-proof]", e);
    return json({ error: "An internal error occurred" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}