import { supabase } from "@/integrations/supabase/client";

type Entry = { data: any; ts: number };
const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<any>>();
const TTL_MS = 60_000;

export function cacheGet<T = any>(key: string): T | null {
  const e = store.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > TTL_MS) return null;
  return e.data as T;
}

export function cacheSet(key: string, data: any) {
  store.set(key, { data, ts: Date.now() });
}

export function cacheInvalidate(prefix?: string) {
  if (!prefix) return store.clear();
  for (const k of Array.from(store.keys())) if (k.startsWith(prefix)) store.delete(k);
}

export async function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  const hit = cacheGet<T>(key);
  if (hit !== null) return hit;
  if (inflight.has(key)) return inflight.get(key) as Promise<T>;
  const p = loader().then((d) => { cacheSet(key, d); inflight.delete(key); return d; })
                   .catch((e) => { inflight.delete(key); throw e; });
  inflight.set(key, p);
  return p;
}

/**
 * Warm common datasets for a school so pages have data already loaded.
 * Fires-and-forgets; errors are swallowed (each page also has its own fetch).
 */
export function warmSchoolCache(schoolId: string, role: string | null) {
  if (!schoolId) return;

  const tasks: Array<[string, () => Promise<any>]> = [];

  const memberWithProfiles = async (r: "student" | "teacher" | "parent") => {
    const { data: m } = await supabase.rpc("admin_list_memberships_with_profile", { _school: schoolId, _role: r as any });
    if (!m?.length) return [];
    const ids = (m as any[]).map((x) => x.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,full_name,email,phone,dob,gender,address,photo_url")
      .in("id", ids);
    const byId: Record<string, any> = {};
    profiles?.forEach((p: any) => (byId[p.id] = p));
    return (m as any[]).map((x) => ({ ...x, ...(byId[x.user_id] || { id: x.user_id }) }));
  };

  if (role === "admin" || role === "teacher") {
    tasks.push([`members:${schoolId}:student`, () => memberWithProfiles("student")]);
    tasks.push([`members:${schoolId}:teacher`, () => memberWithProfiles("teacher")]);
    tasks.push([`members:${schoolId}:parent`,  () => memberWithProfiles("parent")]);
    tasks.push([`parent_links:${schoolId}`, async () => {
      const { data } = await supabase.from("parent_links").select("*").eq("school_id", schoolId);
      return data || [];
    }]);
    tasks.push([`classes:${schoolId}`, async () => {
      const { data } = await supabase.from("classes").select("*").eq("school_id", schoolId);
      return data || [];
    }]);
  }

  for (const [key, loader] of tasks) {
    if (cacheGet(key) !== null || inflight.has(key)) continue;
    void cached(key, loader).catch(() => {});
  }
}