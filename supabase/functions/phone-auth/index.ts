import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const normPhone = (p: string) => p.replace(/[^\d+]/g, "");
const fakeEmail = (phone: string, slug: string) => `p${normPhone(phone).replace(/\+/g, "")}.${slug}@members.edusmart.local`;

// Member sign-in only. Identity = phone + PIN, scoped to a school slug.
// Optionally validates name.
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = await req.json();
    const fullName = (body.fullName ?? "").toString().trim().toLowerCase();
    const phone = normPhone((body.phone ?? "").toString());
    const schoolSlug = (body.schoolSlug ?? "").toString().trim().toLowerCase();
    if (!phone || phone.length < 6) return json({ error: "Invalid phone" }, 400);
    if (!schoolSlug) return json({ error: "Missing school" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, service, { auth: { persistSession: false } });

    const { data: school } = await admin.from("schools").select("id,slug").eq("slug", schoolSlug).maybeSingle();
    if (!school) return json({ error: "School not found" }, 404);

    const email = fakeEmail(phone, school.slug);
    const { data: list } = await admin.auth.admin.listUsers();
    const u = list?.users?.find((x) => x.email === email);
    if (!u) return json({ error: "No member with this phone in this school." }, 404);

    const { data: mem } = await admin.from("memberships")
      .select("role,must_change_pin").eq("user_id", u.id).eq("school_id", school.id).eq("status", "active").maybeSingle();
    if (!mem) return json({ error: "You are not a member of this school." }, 403);

    if (fullName) {
      const { data: prof } = await admin.from("profiles").select("full_name").eq("id", u.id).maybeSingle();
      if (prof?.full_name && prof.full_name.trim().toLowerCase() !== fullName) {
        return json({ error: "Name doesn't match our records." }, 400);
      }
    }

    return json({ ok: true, email, role: mem.role, mustChangePin: !!mem.must_change_pin });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
