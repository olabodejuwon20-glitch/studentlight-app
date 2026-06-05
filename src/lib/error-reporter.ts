import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Global error reporter.
 * - Logs errors to `public.client_errors` (streams to Super Admin via realtime).
 * - Shows a user-facing toast so the person who triggered the error sees it immediately.
 */

type ReportSource = "window" | "unhandledrejection" | "react" | "manual" | "supabase";

type ReportInput = {
  message: string;
  source?: ReportSource;
  cause?: string;
  stack?: string;
  context?: Record<string, any>;
  severity?: "error" | "warning" | "info";
  silent?: boolean; // skip toast
};

const recent = new Map<string, number>();
const DEDUPE_MS = 4000;

function shouldSkip(msg: string) {
  if (!msg) return true;
  // Noise filters
  return (
    /ResizeObserver loop|Non-Error promise rejection captured|Loading chunk \d+ failed|ChunkLoadError|Script error\.?$/i.test(msg)
  );
}

async function getContext() {
  let user_id: string | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user_id = data.user?.id ?? null;
  } catch { /* ignore */ }
  return {
    user_id,
    route: typeof location !== "undefined" ? location.pathname + location.search : null,
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
  };
}

export async function reportError(input: ReportInput) {
  try {
    const message = String(input.message || "").slice(0, 1000);
    if (shouldSkip(message)) return;

    const key = `${input.source ?? "manual"}::${message}`;
    const now = Date.now();
    const last = recent.get(key) ?? 0;
    if (now - last < DEDUPE_MS) return;
    recent.set(key, now);

    if (!input.silent) {
      toast.error(message, {
        description: input.cause ? `Cause: ${input.cause}` : undefined,
        duration: 7000,
      });
    }

    const ctx = await getContext();
    await supabase.from("client_errors").insert({
      message,
      source: input.source ?? "manual",
      cause: input.cause ?? null,
      stack: (input.stack ?? "").slice(0, 4000) || null,
      severity: input.severity ?? "error",
      context: input.context ?? {},
      ...ctx,
    } as any);
  } catch (e) {
    // last-ditch: don't recurse
    // eslint-disable-next-line no-console
    console.warn("[error-reporter] failed", e);
  }
}

let installed = false;
export function installGlobalErrorReporter() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  window.addEventListener("error", (ev) => {
    reportError({
      source: "window",
      message: ev.message || String(ev.error || "Unknown error"),
      cause: ev.filename ? `${ev.filename}:${ev.lineno}:${ev.colno}` : undefined,
      stack: ev.error?.stack,
    });
  });

  window.addEventListener("unhandledrejection", (ev: PromiseRejectionEvent) => {
    const reason: any = ev.reason;
    reportError({
      source: "unhandledrejection",
      message: reason?.message || String(reason || "Unhandled promise rejection"),
      cause: reason?.code || reason?.name,
      stack: reason?.stack,
    });
  });
}