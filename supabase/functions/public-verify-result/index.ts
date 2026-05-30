import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => null);
    const id = typeof body?.id === "string" ? body.id.trim() : "";

    if (!uuidLike.test(id)) {
      return json({ error: "Invalid verification link" }, 400);
    }

    const url = Deno.env.get("SUPABASE_URL");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!url) return json({ error: "Backend configuration missing" }, 500);
    if (!service) return json({ error: "Backend service key missing" }, 500);

    const admin = createClient(url, service, { auth: { persistSession: false } });
    const { data, error } = await admin.rpc("verify_result_slip", { _id: id });

    if (error) {
      console.error("[public-verify-result] rpc failed", error);
      return json({ error: "Verification is currently unavailable" }, 500);
    }

    const row = Array.isArray(data) ? data[0] : null;
    if (!row) return json({ error: "Not found" }, 404);

    return json({ snapshot: row.snapshot, created_at: row.created_at });
  } catch (error) {
    console.error("[public-verify-result] unexpected error", error);
    return json({ error: "An internal error occurred" }, 500);
  }
});