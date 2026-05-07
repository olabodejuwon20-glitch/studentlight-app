import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Loader2, Building2, User, Mail, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { getCurrentSchoolSlug, schoolPath, buildSchoolUrl } from "@/lib/tenant";

export default function Register() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [schoolName, setSchoolName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // If we're already on a subdomain, registration isn't allowed here.
  useEffect(() => {
    if (getCurrentSchoolSlug()) navigate("/auth", { replace: true });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("register-school", {
        body: { schoolName, fullName, email, password },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const slug = (data as any).slug as string;
      const { error: sErr } = await supabase.auth.signInWithPassword({ email, password });
      if (sErr) throw sErr;
      toast.success(`School created — ${buildSchoolUrl(slug, "")}`);
      window.location.href = schoolPath(slug, "/app");
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-[hsl(var(--admin))] via-[hsl(var(--student))] to-[hsl(var(--teacher))] text-white">
        <Link to="/" className="flex items-center gap-3 w-fit">
          <div className="grid place-items-center size-11 rounded-xl bg-white/20 backdrop-blur"><GraduationCap className="size-6" /></div>
          <div><div className="font-display font-bold text-xl leading-none">EduSmart</div><div className="text-xs opacity-80 mt-1">School Management Platform</div></div>
        </Link>
        <div className="space-y-4 max-w-md">
          <h2 className="font-display text-4xl font-bold leading-tight">Register your school</h2>
          <p className="text-white/85">Get your own private subdomain. Onboard teachers, students and parents in minutes.</p>
        </div>
        <div className="text-xs opacity-70">© 2026 EduSmart</div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-10">
        <Card className="w-full max-w-md p-8">
          <h1 className="font-display text-2xl font-bold tracking-tight">Create your school portal</h1>
          <p className="text-sm text-muted-foreground mt-1">You become the admin and get a unique URL.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-2"><Label className="flex items-center gap-1.5"><Building2 className="size-3.5"/>School name</Label>
              <Input required value={schoolName} onChange={e=>setSchoolName(e.target.value)} placeholder="Greenfield Academy" /></div>
            <div className="space-y-2"><Label className="flex items-center gap-1.5"><User className="size-3.5"/>Your full name</Label>
              <Input required value={fullName} onChange={e=>setFullName(e.target.value)} /></div>
            <div className="space-y-2"><Label className="flex items-center gap-1.5"><Mail className="size-3.5"/>Email</Label>
              <Input required type="email" value={email} onChange={e=>setEmail(e.target.value)} /></div>
            <div className="space-y-2"><Label className="flex items-center gap-1.5"><KeyRound className="size-3.5"/>Password</Label>
              <Input required type="password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} /></div>
            <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} Register school</Button>
            <p className="text-xs text-muted-foreground text-center">Already have a school? <Link to="/auth" className="text-primary font-medium">Sign in</Link></p>
          </form>
        </Card>
      </div>
    </div>
  );
}