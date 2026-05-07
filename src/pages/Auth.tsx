import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { GraduationCap, Loader2, Phone, KeyRound, User, Building2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { buildSubdomainUrl } from "@/lib/tenant";

export default function Auth() {
  const navigate = useNavigate();
  const { session, loading, school, schoolLoading, memberships } = useSchool();

  useEffect(() => {
    if (!session || !school) return;
    const m = memberships.find(x => x.school_id === school.id);
    if (!m) return;
    navigate("/app", { replace: true });
  }, [session, school, memberships, navigate]);

  if (loading || schoolLoading) return <div className="min-h-screen grid place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;

  // Root domain: nothing to log into. Send users to register or landing.
  if (!school) return <Navigate to="/register" replace />;

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-[hsl(var(--admin))] via-[hsl(var(--student))] to-[hsl(var(--teacher))] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <Link to="/" className="relative flex items-center gap-3 w-fit">
          <div className="grid place-items-center size-11 rounded-xl bg-white/20 backdrop-blur"><GraduationCap className="size-6" /></div>
          <div><div className="font-display font-bold text-xl leading-none">EduSmart</div><div className="text-xs opacity-80 mt-1">School Management Platform</div></div>
        </Link>
        <div className="relative space-y-4 max-w-md">
          <div className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-white/15 backdrop-blur">
            <Building2 className="size-3.5" /> {school.slug}.edusmart.com
          </div>
          <h2 className="font-display text-4xl font-bold leading-tight">{school.name}</h2>
          <p className="text-white/85">Sign in to your school portal.</p>
        </div>
        <div className="relative text-xs opacity-70">© 2026 EduSmart</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <Card className="w-full max-w-md p-8">
          <Link to="/" className="mb-6 lg:hidden flex items-center gap-2">
            <div className="grid place-items-center size-9 rounded-lg bg-primary text-primary-foreground"><GraduationCap className="size-5" /></div>
            <span className="font-display font-bold text-lg">EduSmart</span>
          </Link>

          <div className="mb-5 flex items-center gap-3 p-3 rounded-lg bg-muted/60 border border-border">
            <div className="size-9 rounded-md bg-primary/10 grid place-items-center"><Building2 className="size-4 text-primary" /></div>
            <div className="min-w-0">
              <div className="text-sm font-semibold truncate">{school.name}</div>
              <div className="text-[11px] text-muted-foreground truncate">{school.slug}.edusmart.com</div>
            </div>
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted-foreground mt-1">Choose how you access this portal.</p>

          <Tabs defaultValue="member" className="mt-6">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="member">Teacher / Student / Parent</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>
            <TabsContent value="member" className="mt-6"><MemberSignIn schoolSlug={school.slug} /></TabsContent>
            <TabsContent value="admin" className="mt-6"><AdminSignIn /></TabsContent>
          </Tabs>

          <div className="mt-6 pt-4 border-t border-border text-center text-xs text-muted-foreground">
            New to this school? <Link to="/join" className="text-primary font-medium">Use your onboarding code</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

function MemberSignIn({ schoolSlug }: { schoolSlug: string }) {
  const [busy, setBusy] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("phone-auth", {
        body: { fullName, phone, schoolSlug },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const email = (data as any).email as string;
      const mustChange = !!(data as any).mustChangePin;
      const { error: sErr } = await supabase.auth.signInWithPassword({ email, password: pin });
      if (sErr) throw new Error("PIN doesn't match. Try again.");
      toast.success("Welcome");
      window.location.href = buildSubdomainUrl(schoolSlug, mustChange ? "/change-pin" : "/app");
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2"><Label className="flex items-center gap-1.5"><User className="size-3.5"/>Full name</Label>
        <Input required value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Ada Lovelace" /></div>
      <div className="space-y-2"><Label className="flex items-center gap-1.5"><Phone className="size-3.5"/>Phone number</Label>
        <Input required type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+233 555 000 000" /></div>
      <div className="space-y-2"><Label className="flex items-center gap-1.5"><KeyRound className="size-3.5"/>6-digit PIN</Label>
        <Input required inputMode="numeric" pattern="\d{6}" maxLength={6} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,""))} placeholder="••••••" />
        <p className="text-[11px] text-muted-foreground">Bulk-onboarded? Default PIN is 123456 — you'll be asked to change it.</p></div>
      <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin"/>}Sign in</Button>
    </form>
  );
}

function AdminSignIn() {
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Welcome back");
      window.location.href = "/app";
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2"><Label className="flex items-center gap-1.5"><Mail className="size-3.5"/>Email</Label>
        <Input required type="email" value={email} onChange={e=>setEmail(e.target.value)} /></div>
      <div className="space-y-2"><Label className="flex items-center gap-1.5"><KeyRound className="size-3.5"/>Password</Label>
        <Input required type="password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} /></div>
      <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin"/>}Sign in</Button>
    </form>
  );
}