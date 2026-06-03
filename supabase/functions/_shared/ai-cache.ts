// Shared AI response cache. Identical (kind + model + messages + scope)
// requests return the previous response without hitting the AI gateway.
// Used by every edge function that calls aiCall().
import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

let _admin: SupabaseClient | null = null;
function admin(): SupabaseClient {
  if (!_admin) {
    _admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _admin;
}

// Canonical stringify: sort keys recursively so message order matters but key order doesn't.
function canonical(value: any): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  const keys = Object.keys(value).sort();
  return "{" + keys.map(k => JSON.stringify(k) + ":" + canonical(value[k])).join(",") + "}";
}

async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function cacheKey(
  kind: string,
  model: string,
  messages: any[],
  scope?: Record<string, any>,
): Promise<string> {
  const payload = canonical({ kind, model, messages, scope: scope ?? null });
  return sha256Hex(payload);
}

export async function cacheKeyForFile(
  kind: string,
  model: string,
  bytes: Uint8Array,
  extra?: Record<string, any>,
): Promise<string> {
  const contentHash = await sha256Hex(bytes);
  const payload = canonical({ kind, model, content: contentHash, extra: extra ?? null });
  return sha256Hex(payload);
}

export interface CachedEntry {
  cache_key: string;
  response: any;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
}

/** Look up a cache entry. On hit, increments hit counters and savings. */
export async function getCached(key: string): Promise<CachedEntry | null> {
  const { data, error } = await admin()
    .from("ai_cache")
    .select("cache_key, school_id, response, prompt_tokens, completion_tokens, cost_usd")
    .eq("cache_key", key)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error || !data) return null;

  const tokens = (data.prompt_tokens ?? 0) + (data.completion_tokens ?? 0);
  const cost = Number(data.cost_usd ?? 0);

  // Best-effort savings bookkeeping. Don't fail the request on errors.
  admin().from("ai_cache").update({
    hits: (data as any).hits ? (data as any).hits + 1 : 1,
    last_used_at: new Date().toISOString(),
    tokens_saved: ((data as any).tokens_saved ?? 0) + tokens,
    cost_saved_usd: ((data as any).cost_saved_usd ?? 0) + cost,
  }).eq("cache_key", key).then(() => {}, () => {});

  return {
    cache_key: data.cache_key,
    response: data.response,
    prompt_tokens: data.prompt_tokens ?? 0,
    completion_tokens: data.completion_tokens ?? 0,
    cost_usd: cost,
  };
}

const TTL_BY_KIND: Record<string, number> = {
  // Deterministic / file-driven kinds — long TTL.
  ingest_doc: 90,
  mark_essay: 90,
  lesson_note: 90,
  lesson_plan: 90,
  report_comment: 60,
  transcription: 90,
  // Conversational kinds — shorter TTL so context evolves naturally.
  tutor_reply: 7,
  principal_query: 7,
  parent_digest: 1,
};

export async function putCached(
  key: string,
  schoolId: string,
  kind: string,
  model: string,
  response: any,
  usage: { prompt: number; completion: number },
  costUsd: number,
  ttlDays?: number,
) {
  const ttl = ttlDays ?? TTL_BY_KIND[kind] ?? 30;
  const expiresAt = new Date(Date.now() + ttl * 86400000).toISOString();
  await admin().from("ai_cache").upsert({
    cache_key: key,
    school_id: schoolId,
    kind,
    model,
    response,
    prompt_tokens: usage.prompt,
    completion_tokens: usage.completion,
    cost_usd: costUsd,
    expires_at: expiresAt,
  }, { onConflict: "cache_key" });
}