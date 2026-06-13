// Helpers to keep synthetic phone-auth emails out of the UI.
// Phone-auth users get emails like `p2349...@members.<host>.local` which are
// internal identifiers, not real contact info. We hide these everywhere and
// fall back to phone or name.

export function isSyntheticEmail(email?: string | null): boolean {
  if (!email) return true;
  const e = email.toLowerCase();
  return (
    e.includes("@members.") ||
    e.endsWith(".local") ||
    e.endsWith(".invalid") ||
    /^p\d{6,}\./.test(e) // p<digits>.<anything>
  );
}

/** Returns the email only if it looks like a real, user-facing address. */
export function publicEmail(email?: string | null): string | null {
  if (!email || isSyntheticEmail(email)) return null;
  return email;
}

/** Returns the best human-readable contact line for a profile. */
export function publicContact(p: { email?: string | null; phone?: string | null }): string {
  const e = publicEmail(p?.email);
  if (e && p?.phone) return `${e} · ${p.phone}`;
  if (e) return e;
  if (p?.phone) return p.phone;
  return "";
}

/** Strip synthetic emails from search haystacks so users can't match them. */
export function publicEmailForSearch(email?: string | null): string {
  return publicEmail(email) ?? "";
}

/** Initials that never fall back to a synthetic email. */
export function publicInitials(p: { full_name?: string | null; email?: string | null }): string {
  const base = p?.full_name || publicEmail(p?.email) || "";
  if (!base) return "?";
  return base.split(/[\s@]/).filter(Boolean).slice(0, 2).map(s => s[0]?.toUpperCase() ?? "").join("") || "?";
}