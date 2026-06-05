/**
 * User-facing error helpers.
 *
 * The goal: never show raw technical jargon (Edge Function returned a non-2xx
 * status code, FunctionsHttpError, JWT, RLS, etc.) to end users. Always surface
 * a short, plain-English message and log the raw error to the console for
 * debugging.
 */

import { reportError } from "@/lib/error-reporter";

const TECH_PATTERNS: { re: RegExp; msg: string }[] = [
  { re: /Edge Function returned a non-2xx/i, msg: "" },
  { re: /FunctionsHttpError|FunctionsFetchError|FunctionsRelayError/i, msg: "" },
  { re: /Failed to fetch|NetworkError|TypeError: Load failed/i, msg: "Network issue — check your internet connection and try again." },
  { re: /JWT expired|invalid (jwt|token)|not authenticated|Unauthorized/i, msg: "Your session has expired. Please sign in again." },
  { re: /permission denied|row-level security|violates row level|RLS|policy/i, msg: "You don't have permission to do that." },
  { re: /duplicate key|already exists|unique constraint/i, msg: "This record already exists." },
  { re: /foreign key|violates foreign key/i, msg: "This action conflicts with related records." },
  { re: /value too long|invalid input syntax|check constraint/i, msg: "Some of the information you entered isn't valid." },
  { re: /rate limit|too many requests/i, msg: "You're doing that too quickly. Please wait a moment and try again." },
];

function pickFromMessage(raw: string, fallback: string): string {
  for (const { re, msg } of TECH_PATTERNS) {
    if (re.test(raw)) return msg || fallback;
  }
  // Keep short, already-friendly messages.
  if (raw && raw.length < 180 && !/\b(at\s+\w+|stack|undefined is not|cannot read)/i.test(raw)) {
    return raw;
  }
  return fallback;
}

export function friendlyError(e: unknown, fallback = "Something went wrong. Please try again."): string {
  if (!e) return fallback;
  if (typeof e === "string") return pickFromMessage(e, fallback);
  const anyE = e as any;
  const raw = anyE?.message || anyE?.error_description || anyE?.error || "";
  // Log the real thing for devs.
  // eslint-disable-next-line no-console
  console.error("[error]", e);
  // Stream to super admin live error feed (silent — caller decides UI)
  reportError({
    source: "supabase",
    message: String(raw || fallback),
    cause: anyE?.code || anyE?.name,
    stack: anyE?.stack,
    silent: true,
  });
  return pickFromMessage(String(raw || ""), fallback);
}

/**
 * Pull the actual error message out of a Supabase edge-function response when
 * the function returned a non-2xx with a JSON body like `{ error: "..." }`.
 * Falls back to friendlyError().
 */
export async function friendlyInvokeError(error: any, fallback?: string): Promise<string> {
  try {
    const ctx = error?.context;
    if (ctx && typeof ctx.json === "function") {
      const body = await ctx.json().catch(() => null);
      const msg = body?.error || body?.message;
      if (msg && typeof msg === "string") return pickFromMessage(msg, fallback || "Something went wrong. Please try again.");
    }
  } catch { /* ignore */ }
  return friendlyError(error, fallback);
}
