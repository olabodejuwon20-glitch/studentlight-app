export function buildSubdomainUrl(slug: string, path = "/app") {
  if (typeof window === "undefined") return path;
  const u = new URL(window.location.href);
  const host = u.hostname;
  const isPreview =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".lovable.app") ||
    host.endsWith(".lovableproject.com");
  if (isPreview) {
    u.searchParams.set("school", slug);
    u.pathname = path;
    u.hash = "";
    return u.toString();
  }
  const root = host.split(".").slice(-2).join(".");
  return `${u.protocol}//${slug}.${root}${path}`;
}

export function getCurrentSchoolSlug() {
  if (typeof window === "undefined") return null;
  const u = new URL(window.location.href);
  const querySlug = u.searchParams.get("school");
  if (querySlug) return querySlug.toLowerCase();

  const host = u.hostname;
  const isPreview =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".lovable.app") ||
    host.endsWith(".lovableproject.com");

  if (isPreview) return null;

  const parts = host.split(".");
  return parts.length >= 3 ? parts[0].toLowerCase() : null;
}

export function buildRootUrl(path = "/") {
  if (typeof window === "undefined") return path;
  const u = new URL(window.location.href);
  const host = u.hostname;
  const isPreview =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".lovable.app") ||
    host.endsWith(".lovableproject.com");
  if (isPreview) {
    u.searchParams.delete("school");
    u.pathname = path;
    u.hash = "";
    return u.toString();
  }
  const parts = host.split(".");
  const root = parts.slice(-2).join(".");
  return `${u.protocol}//${root}${path}`;
}