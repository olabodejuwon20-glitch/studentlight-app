import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function normalizePhone(p: string) {
  return p.replace(/[^\d+]/g, "");
}
function fakeEmail(phone: string, slug: string) {
  return `p${normalizePhone(phone).replace(/\+/g, "")}.${slug}@members.edusmart.local`;
}
function isPin(s: string) { return /^\d{4,6}$/.test(s); }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = await req.json();
    const mode = body.mode as "signup" | "signin";
    const fullName = (body.fullName ?? "").toString().trim();
    const phone = normalizePhone((body.phone ?? "").toString());
    const code = (body.code ?? "").toString().trim();
    const pin = (body.pin ?? "").toString().trim();

    if (!phone || phone.length < 6) return json({ error: "Invalid phone" }, 400);
    if (!code) return json({ error: "School code is required" }, 400);
    if (!isPin(pin)) return json({ error: "PIN must be 4–6 digits" }, 400);
    if (mode === "signup" && !fullName) return json({ error: "Name is required" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, service, { auth: { persistSession: false } });

    // Look up the invite code → school + role
    const { data: invite, error: invErr } = await admin
      .from("invite_codes").select("id, school_id, role, max_uses, uses, expires_at").eq("code", code).maybeSingle();
    if (invErr) return json({ error: invErr.message }, 400);
    if (!invite) return json({ error: "Invalid school code" }, 400);
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) return json({ error: "Code expired" }, 400);

    const { data: school } = await admin.from("schools").select("slug,name").eq("id", invite.school_id).single();
    if (!school) return json({ error: "School not found" }, 400);

    const email = fakeEmail(phone, school.slug);

    if (mode === "signup") {
      // Create the auth user
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email, password: pin, email_confirm: true,
        user_metadata: { full_name: fullName, phone, member_via: "phone_code" },
      });
      if (cErr) {
        // If the user already exists, treat as a friendly hint
        if (/already/i.test(cErr.message)) return json({ error: "This phone is already registered for this school. Please sign in." }, 400);
        return json({ error: cErr.message }, 400);
      }
      const uid = created.user!.id;

      // Profile (trigger usually handles, but ensure)
      await admin.from("profiles").upsert({ id: uid, full_name: fullName, email, phone });

      // Membership (use code role; do not increment uses for shared codes if max is generous)
      await admin.from("memberships").upsert(
        { school_id: invite.school_id, user_id: uid, role: invite.role, status: "active", bio_completed: false },
        { onConflict: "school_id,user_id,role" } as any
      );

      return json({ ok: true, email, schoolSlug: school.slug, schoolName: school.name, role: invite.role, isNew: true });
    }

    // signin: just return the email so the client can sign in with PIN as password
    // Verify a profile exists with this phone for this school
    const { data: existing } = await admin.auth.admin.listUsers();
    const userMatch = existing?.users?.find((u) => u.email === email);
    if (!userMatch) return json({ error: "No account found. Please sign up first." }, 400);

    return json({ ok: true, email, schoolSlug: school.slug, role: invite.role, isNew: false });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
}
