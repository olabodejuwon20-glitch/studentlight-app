import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type Role = "admin" | "teacher" | "student" | "parent";

export const ROLE_META: Record<Role, { name: string; subtitle: string; color: string; portal: string }> = {
  admin:   { name: "Admin",   subtitle: "Administrator", color: "hsl(var(--admin))",   portal: "School Management" },
  teacher: { name: "Teacher", subtitle: "Teacher",       color: "hsl(var(--teacher))", portal: "School Management" },
  student: { name: "Student", subtitle: "Student",       color: "hsl(var(--student))", portal: "Student Portal" },
  parent:  { name: "Parent",  subtitle: "Parent",        color: "hsl(var(--parent))",  portal: "Parent Portal" },
};

export interface School { id: string; name: string; slug: string; logo_url: string | null }
export interface Membership { school_id: string; role: Role; bio_completed?: boolean }

interface Ctx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  displayName: string;
  email: string;
  school: School | null;          // resolved-from-URL school (may be null on landing)
  schoolLoading: boolean;
  memberships: Membership[];      // all schools the current user belongs to
  activeRole: Role | null;        // role within `school` if member
  theme: "light" | "dark";
  toggleTheme: () => void;
  refreshMemberships: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}
const SchoolContext = createContext<Ctx | null>(null);

function detectSlug(): string | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const q = url.searchParams.get("school");
  if (q) return q.toLowerCase();
  const host = url.hostname;
  // skip localhost / preview hosts
  const parts = host.split(".");
  if (host === "localhost" || host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com") || host === "127.0.0.1") return null;
  if (parts.length >= 3) return parts[0].toLowerCase();
  return null;
}

export function SchoolProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">(() => (localStorage.getItem("edusmart-theme") as any) || "light");
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [school, setSchool] = useState<School | null>(null);
  const [schoolLoading, setSchoolLoading] = useState(true);
  const [memberships, setMemberships] = useState<Membership[]>([]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("edusmart-theme", theme);
  }, [theme]);

  // Resolve school from URL once
  useEffect(() => {
    const slug = detectSlug();
    if (!slug) { setSchool(null); setSchoolLoading(false); return; }
    supabase.from("schools").select("id,name,slug,logo_url").eq("slug", slug).maybeSingle()
      .then(({ data }) => { setSchool(data ?? null); setSchoolLoading(false); });
  }, []);

  const loadMemberships = useCallback(async (uid: string) => {
    const { data } = await supabase.from("memberships").select("school_id,role,bio_completed").eq("user_id", uid).eq("status", "active");
    setMemberships((data ?? []) as Membership[]);
  }, []);

  const loadProfile = useCallback(async (uid: string, fallbackEmail: string) => {
    const { data } = await supabase.from("profiles").select("full_name,email").eq("id", uid).maybeSingle();
    setDisplayName(data?.full_name || fallbackEmail);
    setEmail(data?.email || fallbackEmail);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s); setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => {
          loadProfile(s.user.id, s.user.email ?? "");
          loadMemberships(s.user.id);
        }, 0);
      } else {
        setDisplayName(""); setEmail(""); setMemberships([]);
      }
    });
    supabase.auth.getSession().then(async ({ data: { session: s } }) => {
      setSession(s); setUser(s?.user ?? null);
      if (s?.user) {
        await Promise.all([loadProfile(s.user.id, s.user.email ?? ""), loadMemberships(s.user.id)]);
      }
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, [loadMemberships, loadProfile]);

  const activeRole = school ? (memberships.find(m => m.school_id === school.id)?.role ?? null) : null;

  const refreshMemberships = async () => { if (user) await loadMemberships(user.id); };
  const refreshProfile = async () => { if (user) await loadProfile(user.id, user.email ?? ""); };
  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <SchoolContext.Provider value={{
      user, session, loading, displayName, email,
      school, schoolLoading, memberships, activeRole,
      theme, toggleTheme: () => setTheme(t => t === "light" ? "dark" : "light"),
      refreshMemberships, refreshProfile, signOut,
    }}>{children}</SchoolContext.Provider>
  );
}

export const useSchool = () => {
  const c = useContext(SchoolContext);
  if (!c) throw new Error("useSchool must be used within SchoolProvider");
  return c;
};
