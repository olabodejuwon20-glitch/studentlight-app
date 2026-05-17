import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

export default function SuperClaim() {
  const { user } = useSchool();
  const nav = useNavigate();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [hasAny, setHasAny] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "super_admin")
      .then(({ count }) => setHasAny((count ?? 0) > 0));
  }, []);

  async function signInAndClaim(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const uid = data.user.id;
      const { count } = await supabase.from("user_roles").select("id", { count: "exact", head: true }).eq("role", "super_admin");
      if ((count ?? 0) === 0) {
        const { error: ie } = await supabase.from("user_roles").insert({ user_id: uid, role: "super_admin" as any });
        if (ie) throw ie;
        toast.success("Platform owner provisioned");
      }
      nav("/super", { replace: true });
    } catch (err: any) { toast.error(err.message ?? "Failed"); }
    finally { setBusy(false); }
  }

  async function claimExisting() {
    if (!user) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("user_roles").insert({ user_id: user.id, role: "super_admin" as any });
      if (error) throw error;
      toast.success("Claimed");
      nav("/super", { replace: true });
    } catch (err: any) { toast.error(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-md">
        <div className="size-10 rounded-lg bg-foreground text-background grid place-items-center mb-4"><ShieldCheck className="size-5" /></div>
        <h1 className="text-xl font-semibold tracking-tight">EduSmart OS · Platform Access</h1>
        <p className="text-sm text-muted-foreground mt-1">{hasAny ? "Sign in to the Super Admin console." : "No platform owner exists yet. Sign in (or create your account) — the first claimer becomes the owner."}</p>

        {user && hasAny === false ? (
          <Button className="w-full mt-6" disabled={busy} onClick={claimExisting}>
            {busy && <Loader2 className="size-4 animate-spin mr-2" />} Claim platform ownership
          </Button>
        ) : (
          <form className="space-y-3 mt-6" onSubmit={signInAndClaim}>
            <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
            <div><Label>Password</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
            <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin mr-2" />} Continue</Button>
          </form>
        )}
      </div>
    </div>
  );
}