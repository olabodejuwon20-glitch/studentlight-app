import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: claims, error: cErr } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (cErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const { attempt_id } = await req.json();
    if (!attempt_id || typeof attempt_id !== "string") return json({ error: "attempt_id required" }, 400);

    const admin = createClient(url, service, { auth: { persistSession: false } });

    const { data: attempt, error: aErr } = await admin
      .from("exam_attempts")
      .select("id, exam_id, student_id, submitted_at, school_id")
      .eq("id", attempt_id)
      .single();
    if (aErr || !attempt) return json({ error: "Attempt not found" }, 404);
    if (attempt.student_id !== userId) return json({ error: "Forbidden" }, 403);
    if (attempt.submitted_at) return json({ ok: true, score: null, message: "Already submitted" });

    const { data: questions } = await admin
      .from("exam_questions")
      .select("id, correct_index, points")
      .eq("exam_id", attempt.exam_id);
    const { data: answers } = await admin
      .from("exam_answers")
      .select("question_id, selected_index")
      .eq("attempt_id", attempt_id);

    const aMap = new Map((answers ?? []).map((r: any) => [r.question_id, r.selected_index]));
    let correct = 0;
    let total = 0;
    (questions ?? []).forEach((q: any) => {
      total += q.points || 0;
      if (aMap.get(q.id) === q.correct_index) correct += q.points || 0;
    });
    const score = Math.round((correct / (total || 1)) * 100);
    const submitted_at = new Date().toISOString();

    await admin.from("exam_attempts").update({ submitted_at, score }).eq("id", attempt_id);

    return json({ ok: true, score, submitted_at });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});