import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  aiCall, checkQuota, corsHeaders, getAuthedUser, jsonResponse,
} from "../_shared/ai-call.ts";

const SYS = `You are a senior Nigerian secondary-school teacher and instructional designer.
You write detailed, classroom-ready lesson plans aligned to the WAEC/NECO/JAMB curriculum and to NERDC standards.
Always output well-structured Markdown with these headings, in this exact order:

# {Topic} — Lesson Plan
**Subject:** {subject}  |  **Class:** {grade_level}  |  **Duration:** {duration} minutes  |  **Curriculum:** {curriculum}

## Learning Objectives
3–5 measurable outcomes using Bloom's verbs.

## Prior Knowledge
One short paragraph on what students should already know.

## Materials & References
Bullet list. Prefer free/local resources.

## Lesson Flow
A markdown table with columns: Stage | Time | Teacher Activity | Student Activity. Stages: Introduction, Development (split into 2–3 steps), Practice, Closure.

## Worked Example
One complete worked example a teacher can show on the board.

## Differentiation
- For struggling learners: ...
- For advanced learners: ...

## Formative Assessment
3 quick questions a teacher can ask during the lesson.

## Homework
1–2 short tasks tied to the objectives.

## Curriculum Tags
A comma-separated list of curriculum codes or topic tags this lesson covers.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const user = await getAuthedUser(req);
    if (!user) return jsonResponse({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const {
      school_id, subject, topic, grade_level, duration_minutes = 40,
      curriculum = "WAEC", class_id = null, notes = "",
    } = body ?? {};

    if (!school_id || !subject || !topic) {
      return jsonResponse({ error: "school_id, subject and topic are required" }, 400);
    }

    // Verify the caller is a teacher in this school.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: isTeacher } = await admin.rpc("has_school_role", {
      _school: school_id, _user: user.id, _role: "teacher",
    });
    const { data: isAdmin } = await admin.rpc("is_school_admin", {
      _school: school_id, _user: user.id,
    });
    if (!isTeacher && !isAdmin) return jsonResponse({ error: "forbidden" }, 403);

    const quotaErr = await checkQuota(school_id);
    if (quotaErr) return jsonResponse({ error: quotaErr }, 429);

    const userPrompt = `Create a lesson plan.
Subject: ${subject}
Topic: ${topic}
Class / grade level: ${grade_level || "SS2"}
Duration: ${duration_minutes} minutes
Curriculum: ${curriculum}
${notes ? `Teacher notes: ${notes}` : ""}`;

    const result = await aiCall({
      schoolId: school_id,
      userId: user.id,
      kind: "lesson_plan",
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: SYS },
        { role: "user", content: userPrompt },
      ],
      inputForLog: { subject, topic, grade_level, duration_minutes, curriculum, class_id },
    });

    // Persist as a draft lesson plan
    const { data: plan, error: insErr } = await admin
      .from("lesson_plans")
      .insert({
        school_id,
        teacher_id: user.id,
        class_id,
        subject,
        topic,
        duration_minutes,
        curriculum,
        grade_level: grade_level || null,
        content: result.reply,
        status: "draft",
        ai_job_id: result.jobId,
      })
      .select()
      .single();

    if (insErr) {
      console.error("[generate-lesson-plan] insert error", insErr);
      return jsonResponse({ error: "Failed to save lesson plan", draft: result.reply }, 500);
    }

    return jsonResponse({ plan, usage: result.usage, cost_usd: result.costUsd });
  } catch (e: any) {
    console.error("[generate-lesson-plan]", e);
    return jsonResponse({ error: "An internal error occurred" }, e?.status || 500);
  }
});