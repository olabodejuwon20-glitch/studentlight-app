// Automation runner — scans the database every 15 min for risk signals
// (attendance, grade-drop, fee-overdue) and drafts AI parent messages
// into public.parent_alerts. School admins approve/send from the UI.
//
// Invocation: scheduled cron (pg_cron + net.http_post) OR manual POST
// with { school_id?: uuid }. Service-role auth is sufficient.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { aiCall, corsHeaders, jsonResponse } from "../_shared/ai-call.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const ATTENDANCE_WINDOW_DAYS = 5;
const ATTENDANCE_THRESHOLD = 0.7;        // < 70% present
const GRADE_DROP_POINTS = 15;            // ≥15pp drop vs previous result
const FEE_OVERDUE_DAYS = 7;

type Alert = {
  school_id: string;
  student_id: string;
  parent_id: string | null;
  kind: "attendance" | "grade_drop" | "fee_overdue";
  severity: "low" | "medium" | "high";
  signal: Record<string, unknown>;
  dedupe_key: string;
  studentName: string;
};

async function studentParent(student_id: string): Promise<string | null> {
  const { data } = await admin
    .from("parent_links")
    .select("parent_user_id")
    .eq("student_user_id", student_id)
    .limit(1)
    .maybeSingle();
  return data?.parent_user_id ?? null;
}

async function studentName(student_id: string): Promise<string> {
  const { data } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", student_id)
    .maybeSingle();
  return data?.full_name || "your child";
}

async function scanAttendance(school_id: string): Promise<Alert[]> {
  const since = new Date(Date.now() - ATTENDANCE_WINDOW_DAYS * 86400_000)
    .toISOString().slice(0, 10);
  const { data, error } = await admin
    .from("attendance")
    .select("student_id, status, date")
    .eq("school_id", school_id)
    .gte("date", since);
  if (error || !data) return [];
  const by: Record<string, { total: number; present: number }> = {};
  for (const r of data) {
    const s = (by[r.student_id] ??= { total: 0, present: 0 });
    s.total += 1;
    if (r.status === "present" || r.status === "late") s.present += 1;
  }
  const out: Alert[] = [];
  const today = new Date().toISOString().slice(0, 10);
  for (const [student_id, s] of Object.entries(by)) {
    if (s.total < 3) continue;
    const rate = s.present / s.total;
    if (rate >= ATTENDANCE_THRESHOLD) continue;
    out.push({
      school_id, student_id,
      parent_id: await studentParent(student_id),
      kind: "attendance",
      severity: rate < 0.5 ? "high" : "medium",
      signal: { window_days: ATTENDANCE_WINDOW_DAYS, present: s.present, total: s.total, rate: Number(rate.toFixed(2)) },
      dedupe_key: `attendance:${student_id}:${today}`,
      studentName: await studentName(student_id),
    });
  }
  return out;
}

async function scanGradeDrops(school_id: string): Promise<Alert[]> {
  // Last 30 days of results, compare each student's two most recent
  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const { data } = await admin
    .from("assessment_results")
    .select("student_id, percentage, graded_at, assessment_id")
    .eq("school_id", school_id)
    .gte("graded_at", since)
    .order("graded_at", { ascending: false });
  if (!data) return [];
  const grouped: Record<string, typeof data> = {};
  for (const r of data) (grouped[r.student_id] ??= []).push(r);
  const out: Alert[] = [];
  for (const [student_id, rows] of Object.entries(grouped)) {
    if (rows.length < 2) continue;
    const [latest, prev] = rows;
    const drop = Number(prev.percentage) - Number(latest.percentage);
    if (drop < GRADE_DROP_POINTS) continue;
    out.push({
      school_id, student_id,
      parent_id: await studentParent(student_id),
      kind: "grade_drop",
      severity: drop >= 25 ? "high" : "medium",
      signal: { latest_pct: Number(latest.percentage), previous_pct: Number(prev.percentage), drop_pp: drop },
      dedupe_key: `grade_drop:${student_id}:${latest.assessment_id}`,
      studentName: await studentName(student_id),
    });
  }
  return out;
}

async function scanOverdueFees(school_id: string): Promise<Alert[]> {
  const cutoff = new Date(Date.now() - FEE_OVERDUE_DAYS * 86400_000)
    .toISOString().slice(0, 10);
  const { data } = await admin
    .from("school_invoices")
    .select("id, student_id, amount_due_kobo, amount_paid_kobo, currency, due_date, status")
    .eq("school_id", school_id)
    .in("status", ["pending", "partial"])
    .lt("due_date", cutoff);
  if (!data) return [];
  const out: Alert[] = [];
  for (const inv of data) {
    const outstanding = Number(inv.amount_due_kobo) - Number(inv.amount_paid_kobo);
    if (outstanding <= 0) continue;
    out.push({
      school_id, student_id: inv.student_id,
      parent_id: await studentParent(inv.student_id),
      kind: "fee_overdue",
      severity: "medium",
      signal: {
        invoice_id: inv.id,
        outstanding_kobo: outstanding,
        currency: inv.currency,
        due_date: inv.due_date,
        days_overdue: Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86400_000),
      },
      dedupe_key: `fee_overdue:${inv.id}`,
      studentName: await studentName(inv.student_id),
    });
  }
  return out;
}

async function draftMessage(school_id: string, alert: Alert): Promise<{ text: string; jobId: string | null }> {
  const system = `You are a warm, professional school communications assistant.
Draft a short SMS-length message (max 320 chars) to a parent about a concern with their child.
Be factual, empathetic, and end with a clear next step (reply, call, or visit the school portal).
No emojis. No greetings like "Dear" — start with the parent's first name placeholder {{parent_name}}.
Refer to the student as {{student_name}}.`;
  const user = `Concern type: ${alert.kind}
Severity: ${alert.severity}
Signal: ${JSON.stringify(alert.signal)}
Student: ${alert.studentName}`;
  try {
    const res = await aiCall({
      schoolId: school_id,
      kind: "parent_alert_draft",
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.4,
      inputForLog: { kind: alert.kind, dedupe_key: alert.dedupe_key },
    });
    return { text: res.reply.trim(), jobId: res.jobId };
  } catch (_e) {
    // Fallback: deterministic template
    const fallback =
      alert.kind === "attendance"
        ? `Hi {{parent_name}}, we noticed {{student_name}} has attended only ${(alert.signal as any).present}/${(alert.signal as any).total} days recently. Could you reply or call the school office? Thank you.`
        : alert.kind === "grade_drop"
        ? `Hi {{parent_name}}, {{student_name}}'s latest score dropped to ${(alert.signal as any).latest_pct}% from ${(alert.signal as any).previous_pct}%. The teacher would like to discuss support. Please log in or call back.`
        : `Hi {{parent_name}}, an invoice for {{student_name}} is ${(alert.signal as any).days_overdue} days overdue. Please review and settle via the parent portal, or call the bursary.`;
    return { text: fallback, jobId: null };
  }
}

async function runForSchool(school_id: string) {
  const [a, g, f] = await Promise.all([
    scanAttendance(school_id),
    scanGradeDrops(school_id),
    scanOverdueFees(school_id),
  ]);
  const all = [...a, ...g, ...f];
  let inserted = 0;
  for (const alert of all) {
    // Skip if dedupe row already exists
    const { data: exists } = await admin
      .from("parent_alerts")
      .select("id")
      .eq("school_id", school_id)
      .eq("dedupe_key", alert.dedupe_key)
      .maybeSingle();
    if (exists) continue;

    const { text, jobId } = await draftMessage(school_id, alert);
    const { error } = await admin.from("parent_alerts").insert({
      school_id,
      student_id: alert.student_id,
      parent_id: alert.parent_id,
      kind: alert.kind,
      severity: alert.severity,
      signal: alert.signal,
      draft_message: text,
      ai_job_id: jobId,
      dedupe_key: alert.dedupe_key,
      status: "pending",
    });
    if (!error) inserted += 1;
  }
  return { scanned: all.length, inserted };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    // Require a shared cron secret (or a valid super-admin JWT) before doing any work.
    const cronSecret = Deno.env.get("CRON_SECRET");
    const incoming = req.headers.get("x-cron-secret");
    let authorized = !!cronSecret && incoming === cronSecret;
    if (!authorized) {
      const authHeader = req.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        const token = authHeader.replace("Bearer ", "");
        const { data: claims } = await admin.auth.getClaims(token);
        const uid = claims?.claims?.sub as string | undefined;
        if (uid) {
          const { data: isSuper } = await admin.rpc("is_super_admin", { _user: uid });
          if (isSuper === true) authorized = true;
        }
      }
    }
    if (!authorized) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const targetSchool = body.school_id as string | undefined;

    let schools: { id: string }[] = [];
    if (targetSchool) {
      schools = [{ id: targetSchool }];
    } else {
      const { data } = await admin.from("schools").select("id").eq("status", "active");
      schools = data ?? [];
    }

    const results: Record<string, unknown> = {};
    for (const s of schools) {
      results[s.id] = await runForSchool(s.id);
    }
    return jsonResponse({ ok: true, schools: schools.length, results });
  } catch (e) {
    console.error("[automation-runner] error:", e);
    return jsonResponse({ error: String((e as Error).message || e) }, 500);
  }
});