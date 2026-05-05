import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useRole();
  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  }
  if (!session) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}