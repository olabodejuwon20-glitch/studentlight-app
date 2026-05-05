import { Navigate } from "react-router-dom";
import { useRole, type Role } from "@/contexts/RoleContext";

export default function RoleGuard({ allow, children }: { allow: Role; children: React.ReactNode }) {
  const { role } = useRole();
  if (role !== allow) return <Navigate to={`/${role}`} replace />;
  return <>{children}</>;
}