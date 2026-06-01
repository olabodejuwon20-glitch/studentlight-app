// Principal Copilot v1 — read-only agent with typed tools.
// Input: { school_id, message, history?: [{role, content}] }
// Output (stream-less for v1): { reply, tool_trace[], citations[] }
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, getAuthedUser, aiCall } from "../_shared/ai-call.ts";
import { embedOne } from "../_shared/embed.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ---------- typed tools ----------
const TOOLS = [
  {
    type: "function",
    function: {
      name: "students_at_risk",
      description: "Returns students with low recent percentage (<50%) or attendance issues. Optional class_id, threshold (percent).",
      parameters: {
        type: "object",
        properties: {
          class_id: { type: "string", description: "Optional class UUID" },
          threshold: { type: "number", description: "Percentage threshold (default 50)" },
          limit: { type: "number", description: "Max rows (default 20)" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "fee_collection_rate",
      description: "Returns invoice totals: paid, partial, pending, overdue. Optional term filter.",
      parameters: {
        type: "object",
        properties: { term: { type: "string" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "attendance_summary",
      description: "Daily attendance counts (present/absent/late) for the last N days.",
      parameters: {
        type: "object",
        properties: { window_days: { type: "number", description: "Default 7" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "top_weak_topics",
      description: "Returns topics with the lowest average mastery across students.",
      parameters: {
        type: "object",
        properties: {
          subject_code: { type: "string" },
          limit: { type: "number", description: "Default 10" },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "teachers_missing_results",
      description: "Lists teachers who haven't published assessment results recently.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "assessment_coverage",
      description: "Counts assessments by status (draft/scheduled/published/closed), optionally by subject.",
      parameters: {
        type: "object",
        properties: { subject_code: { type: "string" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_classes",
      description: "Average percentage by class for a given metric (default: assessment_results.percentage).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "list_pending_approvals",
      description: "Counts items waiting for principal/admin approval (AI questions, parent messages, comments).",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "knowledge_search",
      description: "Semantic search over the school's uploaded documents (policies, lesson notes, curriculum).",
      parameters: {
        type: "object",
        properties: { query: { type: "string" }, k: { type: "number" } },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "draft_parent_message",
      description: "Drafts a parent message about a specific student and writes it to the approval queue.",
      parameters: {
        type: "object",
        properties: { student_id: { type: "string" }, topic: { type: "string" } },
        required: ["student_id", "topic"],
      },
    },
  },
];

// ---------- tool executors (all school-scoped) ----------
async function execTool(name: string, args: any, schoolId: string, userId: string) {
  switch (name) {
    case "students_at_risk": {
      const threshold = Number(args.threshold ?? 50);
      const limit = Math.min(Number(args.limit ?? 20), 50);
      let q = admin.from("assessment_results")
        .select("student_id, percentage, assessment_id")
        .eq("school_id", schoolId)
        .lt("percentage", threshold)
        .order("graded_at", { ascending: false })
        .limit(limit * 3);
      const { data } = await q;
      const byStudent = new Map<string, { count: number; avg: number; sum: number }>();
      for (const r of data ?? []) {
        const e = byStudent.get(r.student_id) ?? { count: 0, avg: 0, sum: 0 };
        e.count++; e.sum += Number(r.percentage);
        e.avg = Math.round(e.sum / e.count);
        byStudent.set(r.student_id, e);
      }
      const rows = [...byStudent.entries()].slice(0, limit).map(([student_id, v]) => ({
        student_id, recent_avg_percent: v.avg, assessments_below_threshold: v.count,
      }));
      return { threshold, count: rows.length, students: rows };
    }
    case "fee_collection_rate": {
      const { data } = await admin.from("school_invoices")
        .select("status, amount_due_kobo, amount_paid_kobo, term")
        .eq("school_id", schoolId);
      const rows = (data ?? []).filter(r => !args.term || r.term === args.term);
      const sum = (key: string) => rows.filter((r: any) => r.status === key).reduce((s, r: any) => s + Number(r.amount_due_kobo || 0), 0);
      const due = rows.reduce((s, r: any) => s + Number(r.amount_due_kobo || 0), 0);
      const paid = rows.reduce((s, r: any) => s + Number(r.amount_paid_kobo || 0), 0);
      return {
        invoices: rows.length,
        total_due_naira: Math.round(due / 100),
        total_paid_naira: Math.round(paid / 100),
        collection_rate_percent: due ? Math.round((paid / due) * 100) : 0,
        by_status: {
          paid: sum("paid"),
          partial: sum("partial"),
          pending: sum("pending"),
          overdue: sum("overdue"),
        },
      };
    }
    case "attendance_summary": {
      const days = Math.min(Number(args.window_days ?? 7), 60);
      const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
      const { data } = await admin.from("attendance_records")
        .select("date, status")
        .eq("school_id", schoolId)
        .gte("date", since);
      const totals: Record<string, number> = {};
      for (const r of data ?? []) totals[r.status] = (totals[r.status] ?? 0) + 1;
      return { window_days: days, totals };
    }
    case "top_weak_topics": {
      const limit = Math.min(Number(args.limit ?? 10), 25);
      let q = admin.from("student_topic_mastery")
        .select("topic, subject_code, ema_mastery, attempts")
        .eq("school_id", schoolId);
      if (args.subject_code) q = q.eq("subject_code", args.subject_code);
      const { data } = await q;
      const byTopic = new Map<string, { mastery: number[]; attempts: number; subject: string | null }>();
      for (const r of data ?? []) {
        const key = `${r.subject_code ?? "?"}::${r.topic}`;
        const e = byTopic.get(key) ?? { mastery: [], attempts: 0, subject: r.subject_code };
        e.mastery.push(Number(r.ema_mastery)); e.attempts += r.attempts ?? 0;
        byTopic.set(key, e);
      }
      const rows = [...byTopic.entries()].map(([k, v]) => ({
        subject: v.subject, topic: k.split("::")[1],
        avg_mastery_percent: Math.round((v.mastery.reduce((s, n) => s + n, 0) / v.mastery.length) * 100),
        students_assessed: v.mastery.length, total_attempts: v.attempts,
      })).filter(r => r.students_assessed >= 2).sort((a, b) => a.avg_mastery_percent - b.avg_mastery_percent).slice(0, limit);
      return { topics: rows };
    }
    case "teachers_missing_results": {
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const { data: teachers } = await admin.from("memberships")
        .select("user_id").eq("school_id", schoolId).eq("role", "teacher").eq("status", "active");
      const { data: recent } = await admin.from("assessments")
        .select("created_by, status, updated_at").eq("school_id", schoolId).gte("updated_at", since);
      const activeIds = new Set((recent ?? []).filter((a: any) => a.status === "published").map((a: any) => a.created_by));
      const missing = (teachers ?? []).filter(t => !activeIds.has(t.user_id)).map(t => ({ teacher_id: t.user_id }));
      return { window_days: 30, missing_count: missing.length, teachers: missing.slice(0, 30) };
    }
    case "assessment_coverage": {
      let q = admin.from("assessments")
        .select("status, subject_code").eq("school_id", schoolId);
      if (args.subject_code) q = q.eq("subject_code", args.subject_code);
      const { data } = await q;
      const by: Record<string, number> = {};
      for (const r of data ?? []) by[r.status] = (by[r.status] ?? 0) + 1;
      return { total: (data ?? []).length, by_status: by };
    }
    case "compare_classes": {
      const { data: rs } = await admin.from("assessment_results")
        .select("assessment_id, percentage").eq("school_id", schoolId);
      const { data: asses } = await admin.from("assessments")
        .select("id, class_id, title").eq("school_id", schoolId);
      const assMap = new Map((asses ?? []).map((a: any) => [a.id, a]));
      const byClass = new Map<string, number[]>();
      for (const r of rs ?? []) {
        const a: any = assMap.get(r.assessment_id);
        if (!a?.class_id) continue;
        const arr = byClass.get(a.class_id) ?? [];
        arr.push(Number(r.percentage));
        byClass.set(a.class_id, arr);
      }
      const rows = [...byClass.entries()].map(([class_id, arr]) => ({
        class_id, avg_percent: Math.round(arr.reduce((s, n) => s + n, 0) / arr.length), results: arr.length,
      })).sort((a, b) => b.avg_percent - a.avg_percent);
      return { classes: rows };
    }
    case "list_pending_approvals": {
      const { count: questions } = await admin.from("questions_v2")
        .select("id", { head: true, count: "exact" })
        .is("approved_by", null).eq("ai_generated", true)
        .in("assessment_id",
          (await admin.from("assessments").select("id").eq("school_id", schoolId)).data?.map((a: any) => a.id) ?? []);
      const { count: alerts } = await admin.from("parent_alerts")
        .select("id", { head: true, count: "exact" }).eq("school_id", schoolId).eq("status", "pending");
      return { ai_questions_pending: questions ?? 0, parent_alerts_pending: alerts ?? 0 };
    }
    case "knowledge_search": {
      const k = Math.min(Number(args.k ?? 5), 10);
      const vec = await embedOne(args.query);
      const { data, error } = await admin.rpc("match_knowledge_chunks", {
        _school_id: schoolId, _query_embedding: vec as any, _match_count: k,
        _class_id: null, _student_id: null,
      });
      if (error) throw error;
      return { results: (data ?? []).map((r: any) => ({
        title: r.title, content: r.content.slice(0, 600), similarity: Number(r.similarity).toFixed(3),
        document_id: r.document_id,
      })) };
    }
    case "draft_parent_message": {
      const { data: student } = await admin.from("memberships")
        .select("user_id").eq("school_id", schoolId).eq("user_id", args.student_id).maybeSingle();
      if (!student) return { error: "student not in this school" };
      const { data: links } = await admin.from("parent_links")
        .select("parent_id").eq("student_id", args.student_id);
      const parentId = links?.[0]?.parent_id ?? null;
      const { data: alert } = await admin.from("parent_alerts").insert({
        school_id: schoolId, student_id: args.student_id, parent_id: parentId,
        kind: "principal_request", severity: "info",
        draft_message: `Drafted by Principal Copilot — topic: ${args.topic}. (Edit before sending.)`,
        status: "pending",
      }).select("id").single();
      return { ok: true, alert_id: alert?.id, queued_for: "admin/parent-alerts" };
    }
  }
  return { error: `unknown tool: ${name}` };
}

const SYSTEM = `You are the Principal Copilot for a Nigerian school running on the Legacy School platform.
You answer school leadership questions using ONLY the provided typed tools. Never invent numbers.

Rules:
- Always call a tool to fetch data before stating a figure. Cite which tool you used.
- Reply concisely with markdown. Use small tables for lists, bullets for summaries.
- If a request needs an action (e.g. message a parent), call draft_parent_message — it queues for human approval.
- For policy / handbook / curriculum questions, call knowledge_search first.
- If a tool returns no data, say so plainly instead of guessing.
- Respect privacy: never paste raw student IDs in user-facing prose unless the user asked for them.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await getAuthedUser(req);
    if (!user) return jsonResponse({ error: "unauthorized" }, 401);
    const { school_id, message, history = [] } = await req.json();
    if (!school_id || !message) return jsonResponse({ error: "school_id and message required" }, 400);

    // Admin gate
    const { data: mem } = await admin.from("memberships")
      .select("role").eq("school_id", school_id).eq("user_id", user.id).eq("status", "active").maybeSingle();
    if (!mem || mem.role !== "admin") return jsonResponse({ error: "principal/admin only" }, 403);

    const messages: any[] = [
      { role: "system", content: SYSTEM },
      ...history.slice(-12).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user", content: message },
    ];

    const trace: any[] = [];
    let finalReply = "";
    for (let step = 0; step < 4; step++) {
      const res = await aiCall({
        schoolId: school_id, userId: user.id, kind: "principal_copilot",
        model: "google/gemini-2.5-flash",
        messages, tools: TOOLS as any,
        inputForLog: { step, last_user: message.slice(0, 200) },
      });
      const calls = res.toolCalls ?? [];
      if (!calls.length) { finalReply = res.reply; break; }
      // push assistant tool-call turn
      messages.push({ role: "assistant", content: res.reply ?? "", tool_calls: calls });
      for (const c of calls) {
        let args: any = {};
        try { args = JSON.parse(c.function?.arguments ?? "{}"); } catch (_) {}
        const result = await execTool(c.function.name, args, school_id, user.id)
          .catch((e: any) => ({ error: String(e?.message || e) }));
        trace.push({ tool: c.function.name, args, result_preview: JSON.stringify(result).slice(0, 600) });
        messages.push({
          role: "tool", tool_call_id: c.id, name: c.function.name,
          content: JSON.stringify(result).slice(0, 8000),
        });
      }
    }
    if (!finalReply) finalReply = "I gathered the data but couldn't draft a final answer. Try rephrasing the question.";

    return jsonResponse({ reply: finalReply, tool_trace: trace });
  } catch (e: any) {
    console.error("principal-copilot error", e);
    return jsonResponse({ error: String(e?.message || e) }, e?.status ?? 500);
  }
});