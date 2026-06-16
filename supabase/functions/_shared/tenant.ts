// Resolves the authenticated user's school_id from membership rather than trusting
// the request body. Use this in every edge function that performs writes scoped to
// a school. If the caller passes a claimed school_id, it must match a membership.
//
// Usage:
//   const { user, schoolId, role } = await resolveSchoolForUser(req, claimedSchoolId);
//   if (!user) return jsonResponse({ error: "unauthorized" }, 401);
//   if (!schoolId) return jsonResponse({ error: "no active membership" }, 403);

import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

export interface ResolvedTenant {
  user: { id: string; email?: string | null } | null;
  schoolId: string | null;
  role: string | null;
  /** True when caller-supplied school_id did not match a membership. */
  mismatch?: boolean;
}

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

export async function resolveSchoolForUser(
  req: Request,
  claimedSchoolId?: string | null,
): Promise<ResolvedTenant> {
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return { user: null, schoolId: null, role: null };
  }
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userRes } = await userClient.auth.getUser();
  const user = userRes?.user;
  if (!user) return { user: null, schoolId: null, role: null };

  // If a claim was provided, verify the membership exists; otherwise pick the
  // user's most recent active membership.
  if (claimedSchoolId) {
    const { data: m } = await admin()
      .from("memberships")
      .select("school_id, role")
      .eq("user_id", user.id)
      .eq("school_id", claimedSchoolId)
      .eq("status", "active")
      .maybeSingle();
    if (!m) return { user, schoolId: null, role: null, mismatch: true };
    return { user, schoolId: m.school_id, role: m.role };
  }

  const { data: m } = await admin()
    .from("memberships")
    .select("school_id, role, updated_at")
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { user, schoolId: m?.school_id ?? null, role: m?.role ?? null };
}

/** Convenience: enforce per-tenant rate limit via the public.check_rate_limit RPC. */
export async function enforceRateLimit(
  schoolId: string | null,
  userJwt: string,
  key: string,
  max: number,
  windowSeconds: number,
): Promise<boolean> {
  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${userJwt}` } } },
  );
  const { data, error } = await client.rpc("check_rate_limit", {
    _key: key, _max: max, _window_seconds: windowSeconds, _school_id: schoolId,
  });
  if (error) return true; // fail-open on infra error; logs will catch it
  return data === true;
}