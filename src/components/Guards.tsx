import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useSchool, Role } from "@/contexts/SchoolContext";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useSchool();
  if (loading) return <FullLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

export function RequireSchool({ children }: { children: ReactNode }) {
  const { school, schoolLoading, loading, activeRole, user } = useSchool();
  if (loading || schoolLoading) return <FullLoader />;
  if (!user) return <Navigate to="/auth" replace />;
  if (!school) return <Navigate to="/onboarding" replace />;
  if (!activeRole) return <Navigate to="/onboarding" replace />;
  return <>{children}</>;
}

export function RoleGate({ allow, children }: { allow: Role | Role[]; children: ReactNode }) {
  const { activeRole } = useSchool();
  const list = Array.isArray(allow) ? allow : [allow];
  if (!activeRole) return <Navigate to="/onboarding" replace />;
  if (!list.includes(activeRole)) return <Navigate to={`/app`} replace />;
  return <>{children}</>;
}

function FullLoader() {
  return <div className="min-h-screen grid place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
}
