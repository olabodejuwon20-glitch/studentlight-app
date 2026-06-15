import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function rand(len: number, alphabet: string) {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let s = "";
  for (let i = 0; i < len; i++) s += alphabet[bytes[i] % alphabet.length];
  return s;
}

async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const user = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user: u } } = await user.auth.getUser();
    if (!u) return json({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const { school_id, name, quantity, price_kobo, max_uses = 5, expires_at = null } = body || {};
    if (!school_id || !name || !Number.isInteger(quantity) || quantity < 1 || quantity > 5000
      || !Number.isInteger(price_kobo) || price_kobo < 100) {
      return json({ error: "invalid_input" }, 400);
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Verify admin of this school
    const { data: mem } = await admin.from("memberships")
      .select("id").eq("school_id", school_id).eq("user_id", u.id)
      .eq("role", "admin").eq("status", "active").maybeSingle();
    if (!mem) return json({ error: "forbidden" }, 403);

    const { data: batch, error: bErr } = await admin.from("trad_scratch_batches").insert({
      school_id, name, quantity, price_kobo, max_uses, expires_at, created_by: u.id,
    }).select("id").single();
    if (bErr || !batch) return json({ error: "batch_create_failed", details: bErr?.message }, 500);

    const ALPHA_SERIAL = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const ALPHA_PIN = "0123456789";
    const rows: any[] = [];
    const csv: string[] = ["serial,pin"];

    for (let i = 0; i < quantity; i++) {
      const serial = "LS-" + rand(4, ALPHA_SERIAL) + "-" + rand(4, ALPHA_SERIAL);
      const pin = rand(12, ALPHA_PIN);
      const pin_hash = await sha256Hex(pin + "|" + serial);
      rows.push({
        school_id, batch_id: batch.id, serial, pin_hash,
        max_uses, expires_at, status: "available",
      });
      csv.push(`${serial},${pin}`);
    }

    // Chunk inserts
    for (let i = 0; i < rows.length; i += 500) {
      const slice = rows.slice(i, i + 500);
      const { error: cErr } = await admin.from("trad_scratch_cards").insert(slice);
      if (cErr) return json({ error: "card_insert_failed", details: cErr.message }, 500);
    }

    return json({ batch_id: batch.id, count: quantity, csv: csv.join("\n") });
  } catch (e) {
    console.error("[trad-card-generate]", e);
    return json({ error: "internal_error" }, 500);
  }
});

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}