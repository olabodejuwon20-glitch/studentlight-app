import { supabase } from "@/integrations/supabase/client";

type Entry = { data: any; ts: number };
const store = new Map<string, Entry>();
const inflight = new Map<string, Promise<any>>();
const TTL_MS = 60_000;            // "fresh" window — skip network
const STALE_MS = 7 * 24 * 60 * 60 * 1000; // keep usable data for 7d (offline)
const LS_PREFIX = "ls.cache:";

function lsGet(key: string): Entry | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Entry;
    if (!parsed || typeof parsed.ts !== "number") return null;
    if (Date.now() - parsed.ts > STALE_MS) {
      localStorage.removeItem(LS_PREFIX + key);
      return null;
    }
    return parsed;
  } catch { return null; }
}

function lsSet(key: string, entry: Entry) {
  try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(entry)); }
  catch { /* quota — best effort */ }
}

function lsDelete(prefix?: string) {
  try {
    if (!prefix) {
      for (const k of Object.keys(localStorage)) if (k.startsWith(LS_PREFIX)) localStorage.removeItem(k);
      return;
    }
    const full = LS_PREFIX + prefix;
    for (const k of Object.keys(localStorage)) if (k.startsWith(full)) localStorage.removeItem(k);
  } catch { /* ignore */ }
}

export function cacheGet<T = any>(key: string): T | null {
  // Returns ANY cached value (even stale) so pages can show data instantly.
  let e = store.get(key);
  if (!e) {
    const persisted = lsGet(key);
    if (persisted) { store.set(key, persisted); e = persisted; }
  }
  if (!e) return null;
  return e.data as T;
}

/** True if the entry exists and is within the fresh window. */
export function cacheIsFresh(key: string): boolean {
  const e = store.get(key) ?? lsGet(key);
  return !!e && Date.now() - e.ts <= TTL_MS;
}

export function cacheSet(key: string, data: any) {
  const entry: Entry = { data, ts: Date.now() };
  store.set(key, entry);
  lsSet(key, entry);
}

export function cacheInvalidate(prefix?: string) {
  if (!prefix) { store.clear(); lsDelete(); return; }
  for (const k of Array.from(store.keys())) if (k.startsWith(prefix)) store.delete(k);
  lsDelete(prefix);
}

export async function cached<T>(key: string, loader: () => Promise<T>): Promise<T> {
  if (cacheIsFresh(key)) return cacheGet<T>(key) as T;
  if (inflight.has(key)) return inflight.get(key) as Promise<T>;
  const p = loader()
    .then((d) => { cacheSet(key, d); inflight.delete(key); return d; })
    .catch((e) => {
      inflight.delete(key);
      // Offline / network failure: fall back to any stale cached value.
      const stale = cacheGet<T>(key);
      if (stale !== null) return stale;
      throw e;
    });
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