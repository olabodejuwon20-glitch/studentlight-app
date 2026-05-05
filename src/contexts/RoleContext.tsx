import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Role = "admin" | "teacher" | "student" | "parent";

export const ROLE_META: Record<Role, { name: string; user: string; subtitle: string; color: string; portal: string }> = {
  admin:   { name: "Admin",   user: "Admin User",      subtitle: "Super Admin", color: "hsl(var(--admin))",   portal: "School Management" },
  teacher: { name: "Teacher", user: "Mrs. John Smith", subtitle: "Teacher",     color: "hsl(var(--teacher))", portal: "School Management" },
  student: { name: "Student", user: "John Doe",        subtitle: "SS2 A",       color: "hsl(var(--student))", portal: "Student Portal" },
  parent:  { name: "Parent",  user: "Mrs. Jane Doe",   subtitle: "Parent",      color: "hsl(var(--parent))",  portal: "Parent Portal" },
};

interface Ctx { role: Role; setRole: (r: Role) => void; theme: "light" | "dark"; toggleTheme: () => void; }
const RoleContext = createContext<Ctx | null>(null);

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>(() => (localStorage.getItem("edusmart-role") as Role) || "admin");
  const [theme, setTheme] = useState<"light" | "dark">(() => (localStorage.getItem("edusmart-theme") as any) || "light");

  useEffect(() => { localStorage.setItem("edusmart-role", role); }, [role]);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("edusmart-theme", theme);
  }, [theme]);

  return (
    <RoleContext.Provider value={{ role, setRole, theme, toggleTheme: () => setTheme(t => t === "light" ? "dark" : "light") }}>
      {children}
    </RoleContext.Provider>
  );
}

export const useRole = () => {
  const c = useContext(RoleContext);
  if (!c) throw new Error("useRole must be used in RoleProvider");
  return c;
};
