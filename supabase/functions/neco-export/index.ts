import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const esc = (v: any) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const url = Deno.env.get("SUPABASE_URL")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const admin = createClient(url, service, { auth: { persistSession: false } });

    const { data: { user }, error: uErr } = await userClient.auth.getUser();
    if (uErr || !user) return json({ error: "Not authenticated" }, 401);

    const { school_id, class_id, preview } = await req.json();
    if (!school_id) return json({ error: "school_id required" }, 400);

    // Admin check
    const { data: callerMem } = await admin.from("memberships")
      .select("role").eq("school_id", school_id).eq("user_id", user.id).eq("role", "admin").eq("status", "active").maybeSingle();
    if (!callerMem) return json({ error: "Admins only" }, 403);

    const { data: school } = await admin.from("schools").select("name,current_session,current_term,neco_subject_codes").eq("id", school_id).single();
    const codeMap: Record<string, string> = (school?.neco_subject_codes as any) ?? {};

    // Determine students
    let studentIds: string[] = [];
    if (class_id) {
      const { data: enr } = await admin.from("class_enrollments").select("student_id").eq("school_id", school_id).eq("class_id", class_id);
      studentIds = (enr ?? []).map(e => e.student_id);
    } else {
      const { data: stu } = await admin.from("memberships").select("user_id").eq("school_id", school_id).eq("role", "student").eq("status", "active");
      studentIds = (stu ?? []).map(s => s.user_id);
    }
    if (!studentIds.length) return json({ csv: "", rows: [], headers: [] });

    const [{ data: profiles }, { data: mems }, { data: results }] = await Promise.all([
      admin.from("profiles").select("id,full_name,dob,gender").in("id", studentIds),
      admin.from("memberships").select("user_id,profile_data").eq("school_id", school_id).in("user_id", studentIds),
      admin.from("results").select("student_id,subject,score").eq("school_id", school_id).in("student_id", studentIds),
    ]);
    const pById = new Map((profiles ?? []).map(p => [p.id, p]));
    const mById = new Map((mems ?? []).map(m => [m.user_id, (m.profile_data as any) ?? {}]));
    const rByStu: Record<string, Record<string, number>> = {};
    (results ?? []).forEach(r => {
      rByStu[r.student_id] ??= {};
      const cur = rByStu[r.student_id][r.subject];
      rByStu[r.student_id][r.subject] = cur ? Math.round((cur + Number(r.score)) / 2) : Math.round(Number(r.score));
    });

    // Build subject column list — union of all subjects appearing in results
    const subjectsSet = new Set<string>();
    (results ?? []).forEach(r => subjectsSet.add(r.subject));
    const subjects = Array.from(subjectsSet).sort();

    const headers = ["CandidateName", "AdmissionNo", "DOB", "Gender", "Class", "Session", "Term",
      ...subjects.map(s => codeMap[s] ? `${codeMap[s]}_${s}` : s)];

    const rows = studentIds.map(id => {
      const p = pById.get(id) ?? ({} as any);
      const m = mById.get(id) ?? {};
      const sub: Record<string, any> = rByStu[id] ?? {};
      const base: any = {
        CandidateName: p.full_name ?? "",
        AdmissionNo: m.admission_no ?? "",
        DOB: p.dob ?? "",
        Gender: p.gender ?? "",
        Class: m.class ?? "",
        Session: school?.current_session ?? "",
        Term: school?.current_term ?? "",
      };
      subjects.forEach(s => {
        const key = codeMap[s] ? `${codeMap[s]}_${s}` : s;
        base[key] = sub[s] ?? "";
      });
      return base;
    });

    const csv = [headers.join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
    const out = preview ? { headers, rows: rows.slice(0, 10), total: rows.length } : { csv, filename: `${(school?.name ?? "neco").replace(/\s+/g, "_")}_neco_export.csv`, total: rows.length };
    return json(out);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
