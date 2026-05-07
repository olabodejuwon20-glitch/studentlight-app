import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { GraduationCap, Loader2, Mail, KeyRound, Building2, ArrowLeft, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { schoolPath, buildSchoolUrl } from "@/lib/tenant";

/** /:slug/admin — school admin sign in (email + password). */
export default function SchoolAdminLogin() {
  const navigate = useNavigate();
  const { session, loading, school, schoolLoading, memberships } = useSchool();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!session || !school) return;
    if (memberships.find(m => m.school_id === school.id && m.role === "admin")) {
      navigate(schoolPath(school.slug, "/app"), { replace: true });
    }
  }, [session, school, memberships, navigate]);

  if (loading || schoolLoading) return <div className="min-h-screen grid place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  if (!school) return <Navigate to="/" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data: signed, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const uid = signed.user!.id;
      const { data: m } = await supabase.from("memberships")
        .select("role").eq("user_id", uid).eq("school_id", school!.id).eq("role", "admin").eq("status", "active").maybeSingle();
      if (!m) {
        await supabase.auth.signOut();
        throw new Error("This account is not an admin of this school.");
      }
      toast.success("Welcome back");
      window.location.href = schoolPath(school!.slug, "/app");
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-background grid place-items-center p-6">
      <Card className="w-full max-w-md p-8">
        <Link to={schoolPath(school.slug, "")} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="size-3.5" /> Back
        </Link>
        <div className="flex items-center gap-2 mb-5">
          <div className="grid place-items-center size-9 rounded-lg bg-primary text-primary-foreground"><GraduationCap className="size-5" /></div>
          <span className="font-display font-bold text-lg">EduSmart</span>
        </div>
        <div className="mb-5 flex items-center gap-3 p-3 rounded-lg bg-muted/60 border border-border">
          <div className="size-9 rounded-md bg-primary/10 grid place-items-center"><Building2 className="size-4 text-primary" /></div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{school.name}</div>
            <div className="text-[11px] text-muted-foreground truncate">{buildSchoolUrl(school.slug, "")}</div>
          </div>
        </div>
        <div className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary mb-3">
          <ShieldCheck className="size-3" /> Admin only
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Admin sign in</h1>
        <p className="text-sm text-muted-foreground mt-1">Use your registered admin email and password.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-2"><Label className="flex items-center gap-1.5"><Mail className="size-3.5"/>Email</Label>
            <Input required type="email" value={email} onChange={e=>setEmail(e.target.value)} /></div>
          <div className="space-y-2"><Label className="flex items-center gap-1.5"><KeyRound className="size-3.5"/>Password</Label>
            <Input required type="password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin mr-1.5"/>}Sign in</Button>
        </form>
      </Card>
    </div>
  );
}