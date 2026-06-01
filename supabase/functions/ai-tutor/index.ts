import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STUDENT_SYS = `You are Legacy Tutor — a warm, sharp study companion for Nigerian K-12 / WAEC / NECO / JAMB students.
- Explain clearly with worked examples and analogies.
- Use short paragraphs, bullet points, and LaTeX-style math when helpful.
- Encourage active recall: end answers with a quick check-question when natural.
- If the student attaches an image, read it carefully before answering.
- Be concise unless asked for depth.`;

const TEACHER_SYS = `You are Legacy Co-Teacher — an assistant for educators.
Help with lesson plans, scheme of work, rubrics, exam-question generation, marking guides,
parent-communication wording, and pedagogy advice. Use a professional, supportive tone.
Always structure outputs (headings, bullets) so the teacher can paste them into their tools.`;

function sysFor(role: string | undefined) {
  return role === "teacher" ? TEACHER_SYS : STUDENT_SYS;
}

async function callGateway(body: any, stream = false) {
  return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: "google/gemini-2.5-flash", stream, ...body }),
  });
}

function gatewayError(status: number) {
  if (status === 429) return "Rate limit reached. Please wait a moment.";
  if (status === 402) return "AI credits exhausted. Please top up.";
  return "AI service error.";
}

// Build multimodal content from text + attachments[]
function buildUserContent(text: string, attachments: any[] | undefined) {
  const parts: any[] = [];
  if (text) parts.push({ type: "text", text });
  for (const att of attachments ?? []) {
    if (att?.type === "image" && att?.url) {
      parts.push({ type: "image_url", image_url: { url: att.url } });
    } else if (att?.type === "file" && att?.name) {
      parts.push({ type: "text", text: `[Attached file: ${att.name}]` });
    } else if (att?.type === "audio" && att?.transcript) {
      parts.push({ type: "text", text: `[Voice note transcript] ${att.transcript}` });
    }
  }
  return parts.length === 1 && parts[0].type === "text" ? text : parts;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userRes } = await userClient.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(url, service);

    const body = await req.json();
    const {
      conversation_id,
      school_id,
      role: portalRole = "student",
      message,
      attachments = [],
      skill = null, // "quiz" | "summarize" | "explain_exam" | "plan_week" | null
      skill_input = {},
    } = body ?? {};

    if (!conversation_id || !school_id) {
      return new Response(JSON.stringify({ error: "missing conversation_id or school_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify conversation ownership
    const { data: conv } = await admin
      .from("ai_conversations")
      .select("id, user_id, school_id, title")
      .eq("id", conversation_id)
      .maybeSingle();
    if (!conv || conv.user_id !== user.id || conv.school_id !== school_id) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------- SKILL ROUTES (non-streaming) ----------
    if (skill) {
      let injected = "";
      if (skill === "explain_exam") {
        const { data: attempt } = await admin
          .from("exam_attempts").select("id, exam_id, score, submitted_at")
          .eq("student_id", user.id).order("submitted_at", { ascending: false, nullsFirst: false })
          .limit(1).maybeSingle();
        if (attempt?.id) {
          const { data: review } = await admin.rpc("get_exam_review", { _attempt_id: attempt.id });
          const wrong = (review ?? []).filter((r: any) => !r.q_is_correct);
          injected = `Student's most recent exam (score ${attempt.score ?? "?"}). Wrong answers:\n` +
            wrong.slice(0, 8).map((r: any, i: number) =>
              `${i + 1}. ${r.q_prompt}\nOptions: ${JSON.stringify(r.q_options)}\nChose: ${r.q_selected_index ?? "blank"} | Correct: ${r.q_correct_index}`
            ).join("\n\n");
        } else {
          injected = "No recent exam attempts found.";
        }
      } else if (skill === "plan_week") {
        const { data: enrollments } = await admin
          .from("class_enrollments").select("class_id, classes(name, subject)")
          .eq("student_id", user.id).eq("school_id", school_id);
        const { data: exams } = await admin
          .from("exams").select("title, subject, scheduled_at")
          .eq("school_id", school_id).not("scheduled_at", "is", null)
          .gte("scheduled_at", new Date().toISOString())
          .order("scheduled_at").limit(10);
        injected = `Subjects: ${(enrollments ?? []).map((e: any) => e.classes?.subject || e.classes?.name).filter(Boolean).join(", ") || "none"}.\n` +
          `Upcoming exams: ${(exams ?? []).map((e: any) => `${e.title} (${e.subject}, ${new Date(e.scheduled_at).toDateString()})`).join("; ") || "none"}.`;
      }

      const prompts: Record<string, string> = {
        quiz: `Generate a 5-question multiple-choice quiz on: ${skill_input.topic || message || "general study"}.
Render each as: question, then **A) B) C) D)** options, then on a new line "Answer: X — short explanation". Number 1–5.`,
        summarize: `Summarize the attached note into: (1) a 5-bullet summary, (2) 5 flashcards (Q → A). Use clear headings.`,
        explain_exam: `Walk the student through their wrong answers below. For each: state the right answer, explain why, then one tip to avoid the mistake.\n\n${injected}`,
        plan_week: `Build a Mon–Sun study schedule (2 focused 45-min sessions/day) using this context:\n${injected}\nFormat as a markdown table: Day | Morning | Evening.`,
      };

      const skillMsgs = [
        { role: "system", content: sysFor(portalRole) },
        { role: "user", content: buildUserContent(prompts[skill] ?? message ?? "", attachments) },
      ];
      const r = await callGateway({ messages: skillMsgs }, false);
      if (!r.ok) {
        return new Response(JSON.stringify({ error: gatewayError(r.status) }), {
          status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const data = await r.json();
      const reply = data.choices?.[0]?.message?.content ?? "";

      // Persist user request + assistant reply
      await admin.from("ai_chats").insert([
        { school_id, user_id: user.id, conversation_id, role: "user", content: message || prompts[skill], attachments },
        { school_id, user_id: user.id, conversation_id, role: "assistant", content: reply },
      ]);
      await admin.from("ai_conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversation_id);

      return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ---------- DEFAULT CHAT (streaming) ----------
    // Load conversation history
    const { data: history } = await admin
      .from("ai_chats")
      .select("role, content, attachments")
      .eq("conversation_id", conversation_id)
      .order("created_at", { ascending: true })
      .limit(60);

    const msgs: any[] = [{ role: "system", content: sysFor(portalRole) }];
    for (const h of history ?? []) {
      msgs.push({ role: h.role, content: buildUserContent(h.content, h.attachments as any[]) });
    }
    msgs.push({ role: "user", content: buildUserContent(message ?? "", attachments) });

    // Insert user message immediately
    await admin.from("ai_chats").insert({
      school_id, user_id: user.id, conversation_id, role: "user",
      content: message ?? "", attachments,
    });

    const upstream = await callGateway({ messages: msgs }, true);
    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => "");
      console.error("[ai-tutor upstream]", upstream.status, text);
      return new Response(JSON.stringify({ error: gatewayError(upstream.status) }), {
        status: upstream.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Tee the stream: forward to client, accumulate to save
    let assistantText = "";
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const reader = upstream.body.getReader();
    let buf = "";

    const stream = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (done) {
          // Persist assistant + bump conversation
          if (assistantText.trim()) {
            await admin.from("ai_chats").insert({
              school_id, user_id: user.id, conversation_id, role: "assistant",
              content: assistantText,
            });
            // Auto-title if still "New chat"
            if (conv.title === "New chat") {
              const title = (assistantText.split("\n")[0] || message || "Chat")
                .replace(/[#*`>_~]/g, "").trim().slice(0, 60);
              await admin.from("ai_conversations")
                .update({ title, last_message_at: new Date().toISOString() })
                .eq("id", conversation_id);
            } else {
              await admin.from("ai_conversations")
                .update({ last_message_at: new Date().toISOString() })
                .eq("id", conversation_id);
            }
          }
          controller.close();
          return;
        }
        controller.enqueue(value);
        // Accumulate text from deltas
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx); buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") continue;
          try {
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content;
            if (typeof c === "string") assistantText += c;
          } catch { /* partial */ }
        }
      },
      cancel() { reader.cancel(); },
    });

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("[ai-tutor]", e);
    return new Response(JSON.stringify({ error: "An internal error occurred" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
