const RESERVED = new Set(["", "register", "signin", "auth", "app", "bio", "join", "change-pin", "admin-signin", "api", "assets", "favicon.ico"]);

export function getCurrentSchoolSlug(): string | null {
  if (typeof window === "undefined") return null;
  const u = new URL(window.location.href);
  const q = u.searchParams.get("school");
  if (q) return q.toLowerCase();
  const first = u.pathname.split("/").filter(Boolean)[0]?.toLowerCase();
  if (!first || RESERVED.has(first)) return null;
  return first;
}

/** Path under a school: schoolPath("greenfield-xy", "/app") -> "/greenfield-xy/app" */
export function schoolPath(slug: string | null | undefined, path = "/auth") {
  if (!slug) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `/${slug}${p}`;
}

/** Absolute URL for a school portal (uses current origin) */
export function buildSchoolUrl(slug: string, path = "/auth") {
  if (typeof window === "undefined") return schoolPath(slug, path);
  return `${window.location.origin}${schoolPath(slug, path)}`;
}

export function buildRootUrl(path = "/") {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}
