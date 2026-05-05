import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type Role = "admin" | "teacher" | "student" | "parent";

export const ROLE_META: Record<Role, { name: string; user: string; subtitle: string; color: string; portal: string }> = {
  admin:   { name: "Admin",   user: "Admin User",      subtitle: "Super Admin", color: "hsl(var(--admin))",   portal: "School Management" },
  teacher: { name: "Teacher", user: "Mrs. John Smith", subtitle: "Teacher",     color: "hsl(var(--teacher))", portal: "School Management" },
  student: { name: "Student", user: "John Doe",        subtitle: "SS2 A",       color: "hsl(var(--student))", portal: "Student Portal" },
  parent:  { name: "Parent",  user: "Mrs. Jane Doe",   subtitle: "Parent",      color: "hsl(var(--parent))",  portal: "Parent Portal" },
};

interface Ctx {
  role: Role;
  setRole: (r: Role) => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
  user: User | null;
  session: Session | null;
  loading: boolean;
  displayName: string;
  signOut: () => Promise<void>;
}
const RoleContext = createContext<Ctx | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => (localStorage.getItem("edusmart-role") as Role) || "admin");
  const [theme, setTheme] = useState<"light" | "dark">(() => (localStorage.getItem("edusmart-theme") as any) || "light");
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { localStorage.setItem("edusmart-role", role); }, [role]);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("edusmart-theme", theme);
  }, [theme]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        setTimeout(() => loadUserData(s.user.id), 0);
      } else {
        setDisplayName("");
      }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) loadUserData(s.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function loadUserData(uid: string) {
    const [{ data: roleRow }, { data: profile }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
      supabase.from("profiles").select("full_name,email").eq("id", uid).maybeSingle(),
    ]);
    if (roleRow?.role) setRoleState(roleRow.role as Role);
    if (profile?.full_name) setDisplayName(profile.full_name);
    else if (profile?.email) setDisplayName(profile.email);
    setLoading(false);
  }

  const setRole = (r: Role) => setRoleState(r);
  const signOut = async () => { await supabase.auth.signOut(); setRoleState("admin"); };

  return (
    <RoleContext.Provider value={{
      role, setRole, theme,
      toggleTheme: () => setTheme(t => t === "light" ? "dark" : "light"),
      user, session, loading, displayName, signOut,
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export const useRole = () => {
  const c = useContext(RoleContext);
  if (!c) throw new Error("useRole must be used in RoleProvider");
  return c;
};
