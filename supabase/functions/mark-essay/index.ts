// Mark an essay answer against a rubric using Lovable AI.
// Returns per-criterion scores, overall numeric grade (0-100), and feedback.
// Persists the suggestion on assessment_answers_v2 when answer_id is provided.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { aiCall, corsHeaders, getAuthedUser, jsonResponse, checkQuota } from "../_shared/ai-call.ts";

interface Criterion { name: string; weight: number; descriptor?: string; max?: number }

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await getAuthedUser(req);
    if (!user) return jsonResponse({ error: "Not authenticated" }, 401);

    const body = await req.json().catch(() => ({}));
    const {
      school_id,
      answer_id,            // optional — when set, suggestion is saved to that row
      question,             // string
      student_answer,       // string
      rubric,               // { name, criteria: Criterion[] }  OR rubric_id
      rubric_id,
      max_points,           // total marks for the question (defaults 100)
    } = body ?? {};

    if (!school_id || !question || !student_answer) {
      return jsonResponse({ error: "school_id, question and student_answer are required" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Membership check
    const { data: mem } = await admin.from("memberships")
      .select("role").eq("school_id", school_id).eq("user_id", user.id)
      .eq("status", "active").maybeSingle();
    if (!mem || !["teacher", "admin"].includes(mem.role)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const quotaMsg = await checkQuota(school_id);
    if (quotaMsg) return jsonResponse({ error: quotaMsg }, 402);

    // Resolve rubric
    let resolvedRubric: { name: string; criteria: Criterion[] } | null = null;
    if (rubric_id) {
      const { data: r } = await admin.from("marking_rubrics")
        .select("name, criteria").eq("id", rubric_id).eq("school_id", school_id).maybeSingle();
      if (r) resolvedRubric = { name: r.name, criteria: (r.criteria as Criterion[]) ?? [] };
    } else if (rubric?.criteria?.length) {
      resolvedRubric = { name: rubric.name ?? "Custom", criteria: rubric.criteria };
    }
    if (!resolvedRubric || !resolvedRubric.criteria.length) {
      resolvedRubric = {
        name: "Default",
        criteria: [
          { name: "Content & accuracy", weight: 0.5 },
          { name: "Structure & clarity", weight: 0.25 },
          { name: "Language & mechanics", weight: 0.25 },
        ],
      };
    }
    const totalMax = Number(max_points) > 0 ? Number(max_points) : 100;

    const sys = `You are a fair, rigorous secondary-school marker (WAEC/NECO standard).
Score the student's answer against the rubric. Be specific and reference the answer.
Return strict JSON only: {
  "per_criterion": [ { "name": string, "score": number (0-1), "comment": string } ],
  "overall_score": number (0-${totalMax}),
  "strengths": string,
  "improvements": string
}`;
    const usr = `Question:\n${question}\n\nRubric "${resolvedRubric.name}" (weights sum to 1):\n${
      resolvedRubric.criteria.map(c => `- ${c.name} (weight ${c.weight}${c.descriptor ? `: ${c.descriptor}` : ""})`).join("\n")
    }\n\nStudent answer:\n"""${String(student_answer).slice(0, 8000)}"""\n\nMax total marks: ${totalMax}. Return JSON only.`;

    const result = await aiCall({
      schoolId: school_id,
      userId: user.id,
      kind: "mark_essay",
      model: "google/gemini-2.5-flash",
      temperature: 0.2,
      messages: [
        { role: "system", content: sys },
        { role: "user", content: usr },
      ],
      inputForLog: { answer_id, rubric: resolvedRubric.name, max_points: totalMax },
    });

    // Parse JSON from the model reply
    let parsed: any = null;
    try {
      const m = result.reply.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(m ? m[0] : result.reply);
    } catch {
      return jsonResponse({ error: "Could not parse AI response", raw: result.reply }, 502);
    }

    // Clamp score
    const overall = Math.max(0, Math.min(totalMax, Number(parsed.overall_score) || 0));
    parsed.overall_score = overall;

    if (answer_id) {
      // Cross-school guard: ensure the answer belongs to this school
      const { data: ans } = await admin
        .from("assessment_answers_v2")
        .select("id, school_id")
        .eq("id", answer_id)
        .eq("school_id", school_id)
        .maybeSingle();
      if (!ans) return jsonResponse({ error: "Forbidden" }, 403);
      await admin.from("assessment_answers_v2").update({
        ai_grade: overall,
        ai_feedback: parsed,
        ai_job_id: result.jobId,
      }).eq("id", answer_id);
    }

    return jsonResponse({
      ok: true,
      job_id: result.jobId,
      rubric: resolvedRubric.name,
      max_points: totalMax,
      result: parsed,
    });
  } catch (e: any) {
    return jsonResponse({ error: String(e?.message || e) }, e?.status ?? 500);
  }
});