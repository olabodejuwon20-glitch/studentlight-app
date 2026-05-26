import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "ls_analytics_session";

export function getAnalyticsSession(): string {
  try {
    let s = sessionStorage.getItem(SESSION_KEY);
    if (!s) {
      s = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, s);
    }
    return s;
  } catch {
    return "anon";
  }
}

function detectDevice(): string {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  if (/Mobi|Android|iPhone/i.test(ua)) return "mobile";
  if (/iPad|Tablet/i.test(ua)) return "tablet";
  return "desktop";
}

let lastPath = "";
let lastAt = 0;

export async function trackPageView(path: string, userId?: string | null, schoolId?: string | null) {
  const now = Date.now();
  // Dedup rapid duplicate hits (same path within 800ms)
  if (path === lastPath && now - lastAt < 800) return;
  lastPath = path;
  lastAt = now;
  try {
    await supabase.from("page_views").insert({
      path,
      referrer: typeof document !== "undefined" ? document.referrer || null : null,
      session_id: getAnalyticsSession(),
      user_id: userId ?? null,
      school_id: schoolId ?? null,
      device: detectDevice(),
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 240) : null,
    });
  } catch {
    /* ignore */
  }
}

export async function trackAuthEvent(event: "sign_in" | "sign_up" | "sign_out", userId?: string | null, schoolId?: string | null) {
  try {
    await supabase.from("auth_events").insert({
      event,
      user_id: userId ?? null,
      school_id: schoolId ?? null,
      session_id: getAnalyticsSession(),
    });
  } catch {
    /* ignore */
  }
}