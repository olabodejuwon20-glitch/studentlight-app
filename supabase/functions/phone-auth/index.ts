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
const isPin = (s: string) => /^\d{4,6}$/.test(s);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const body = await req.json();
    const mode = body.mode as "signup" | "signin";
    const fullName = (body.fullName ?? "").toString().trim();
    const phone = normPhone((body.phone ?? "").toString());
    const code = (body.code ?? "").toString().trim();
    const pin = (body.pin ?? "").toString().trim();
    const schoolSlug = (body.schoolSlug ?? "").toString().trim().toLowerCase();

    if (!phone || phone.length < 6) return json({ error: "Invalid phone" }, 400);
    if (!isPin(pin)) return json({ error: "PIN must be 4–6 digits" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(url, service, { auth: { persistSession: false } });

    // Resolve school: by code (signup) or by slug (signin/signup-with-slug)
    let schoolId: string | null = null;
    let slug = schoolSlug;
    let role: string | null = null;

    if (code) {
      const { data: invite } = await admin.from("invite_codes").select("school_id, role, expires_at").eq("code", code).maybeSingle();
      if (!invite) return json({ error: "Invalid school code" }, 400);
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) return json({ error: "Code expired" }, 400);
      schoolId = invite.school_id; role = invite.role;
      const { data: s } = await admin.from("schools").select("slug,name").eq("id", schoolId!).single();
      if (!s) return json({ error: "School not found" }, 400);
      slug = s.slug;
    } else if (slug) {
      const { data: s } = await admin.from("schools").select("id,name,slug").eq("slug", slug).maybeSingle();
      if (!s) return json({ error: "School not found" }, 400);
      schoolId = s.id;
    } else {
      return json({ error: "Please provide a school code or be on a school portal" }, 400);
    }

    const email = fakeEmail(phone, slug);

    if (mode === "signup") {
      if (!fullName) return json({ error: "Name is required" }, 400);
      if (!role) return json({ error: "An invite code is required to join a school" }, 400);

      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email, password: pin, email_confirm: true,
        user_metadata: { full_name: fullName, phone, member_via: "phone_code" },
      });
      if (cErr) {
        if (/already/i.test(cErr.message)) return json({ error: "This phone is already registered for this school. Please sign in instead." }, 400);
        return json({ error: cErr.message }, 400);
      }
      const uid = created.user!.id;
      await admin.from("profiles").upsert({ id: uid, full_name: fullName, email, phone });
      await admin.from("memberships").upsert(
        { school_id: schoolId, user_id: uid, role, status: "active", bio_completed: false },
        { onConflict: "school_id,user_id,role" } as any,
      );
      return json({ ok: true, email, schoolSlug: slug, role, isNew: true });
    }

    // signin: must have a membership in the resolved school
    const { data: list } = await admin.auth.admin.listUsers();
    const u = list?.users?.find((x) => x.email === email);
    if (!u) return json({ error: "No account found for this phone in this school." }, 400);
    const { data: mem } = await admin.from("memberships").select("role").eq("user_id", u.id).eq("school_id", schoolId!).eq("status", "active").maybeSingle();
    if (!mem) return json({ error: "You are not a member of this school." }, 403);

    return json({ ok: true, email, schoolSlug: slug, role: mem.role, isNew: false });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
