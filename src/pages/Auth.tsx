import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Loader2, Phone, KeyRound, Hash, User, Building2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

function buildSchoolUrl(slug: string, path = "/auth") {
  const url = new URL(window.location.href);
  const host = url.hostname;
  const isPreview = host === "localhost" || host === "127.0.0.1" || host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com");
  if (isPreview) {
    url.searchParams.set("school", slug);
    url.pathname = path;
    return url.toString();
  }
  const root = host.split(".").slice(-2).join(".");
  return `${url.protocol}//${slug}.${root}${path}`;
}

export default function Auth() {
  const navigate = useNavigate();
  const { session, loading, school, schoolLoading } = useSchool();
  const [tab, setTab] = useState<"member" | "admin">("member");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (session) navigate("/onboarding", { replace: true }); }, [session, navigate]);
  if (loading || schoolLoading) return <div className="min-h-screen grid place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-[hsl(var(--admin))] via-[hsl(var(--student))] to-[hsl(var(--teacher))] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <Link to="/" className="relative flex items-center gap-3 w-fit">
          <div className="grid place-items-center size-11 rounded-xl bg-white/20 backdrop-blur"><GraduationCap className="size-6" /></div>
          <div>
            <div className="font-display font-bold text-xl leading-none">EduSmart</div>
            <div className="text-xs opacity-80 mt-1">School Management Platform</div>
          </div>
        </Link>
        <div className="relative space-y-4 max-w-md">
          {school ? (
            <>
              <div className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-white/15 backdrop-blur">
                <Building2 className="size-3.5" /> {school.slug}.edusmart.app
              </div>
              <h2 className="font-display text-4xl font-bold leading-tight">{school.name}</h2>
              <p className="text-white/85">Sign in to your private school portal. Only members of {school.name} can access this workspace.</p>
            </>
          ) : (
            <>
              <h2 className="font-display text-4xl font-bold leading-tight">One platform.<br/>Every school.</h2>
              <p className="text-white/85">Each school gets its own private subdomain — your students, teachers and parents sign in there.</p>
            </>
          )}
        </div>
        <div className="relative text-xs opacity-70">© 2026 EduSmart</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <Card className="w-full max-w-md p-8">
          <Link to="/" className="mb-6 lg:hidden flex items-center gap-2">
            <div className="grid place-items-center size-9 rounded-lg bg-primary text-primary-foreground"><GraduationCap className="size-5" /></div>
            <span className="font-display font-bold text-lg">EduSmart</span>
          </Link>

          {school && (
            <div className="mb-5 flex items-center gap-3 p-3 rounded-lg bg-muted/60 border border-border">
              <div className="size-9 rounded-md bg-primary/10 grid place-items-center"><Building2 className="size-4 text-primary" /></div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate">{school.name}</div>
                <div className="text-[11px] text-muted-foreground truncate">Signing in to {school.slug}.edusmart.app</div>
              </div>
            </div>
          )}

          <h1 className="font-display text-2xl font-bold tracking-tight">{school ? "Sign in" : "Find your school"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {school ? "Choose how you access this portal." : "Enter your school's slug to continue, or contact your admin."}
          </p>

          {!school ? (
            <Tabs defaultValue="find" className="mt-6">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="find">Find school</TabsTrigger>
                <TabsTrigger value="admin">Create / join</TabsTrigger>
              </TabsList>
              <TabsContent value="find" className="mt-6"><FindSchool /></TabsContent>
              <TabsContent value="admin" className="mt-6">
                <p className="text-xs text-muted-foreground mb-4">
                  Sign in or create an account to create a new school or join one with an invite code.
                </p>
                <AdminAuth busy={busy} setBusy={setBusy} />
              </TabsContent>
            </Tabs>
          ) : (
            <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-6">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="member">Teacher / Student / Parent</TabsTrigger>
                <TabsTrigger value="admin">Admin</TabsTrigger>
              </TabsList>
              <TabsContent value="member" className="mt-6">
                <MemberAuth busy={busy} setBusy={setBusy} schoolSlug={school.slug} />
              </TabsContent>
              <TabsContent value="admin" className="mt-6">
                <AdminAuth busy={busy} setBusy={setBusy} />
              </TabsContent>
            </Tabs>
          )}
        </Card>
      </div>
    </div>
  );
}

function FindSchool() {
  const [slug, setSlug] = useState("");
  const [busy, setBusy] = useState(false);

  async function go(e: React.FormEvent) {
    e.preventDefault();
    const s = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (!s) return;
    setBusy(true);
    const { data } = await supabase.from("schools").select("slug").eq("slug", s).maybeSingle();
    setBusy(false);
    if (!data) return toast.error("School not found. Check the slug with your admin.");
    window.location.href = buildSchoolUrl(s, "/auth");
  }

  return (
    <form onSubmit={go} className="mt-6 space-y-4">
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5"><Building2 className="size-3.5" /> School slug</Label>
        <div className="flex gap-2">
          <Input required value={slug} onChange={e => setSlug(e.target.value)} placeholder="greenfield" />
          <Button type="submit" disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}</Button>
        </div>
        <p className="text-[11px] text-muted-foreground">Your portal: <span className="font-mono">[slug].edusmart.app</span></p>
      </div>
      <div className="border-t border-border pt-4 text-sm text-muted-foreground">
        New here? Switch to the <span className="text-primary font-medium">Create / join</span> tab above.
      </div>
    </form>
  );
}

function MemberAuth({ busy, setBusy, schoolSlug }: { busy: boolean; setBusy: (b: boolean) => void; schoolSlug: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("phone-auth", {
        body: { mode, fullName, phone, code: mode === "signup" ? code : "", pin, schoolSlug },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const email = (data as any).email as string;
      const isNew = !!(data as any).isNew;

      const { error: sErr } = await supabase.auth.signInWithPassword({ email, password: pin });
      if (sErr) throw new Error("PIN doesn't match. Try again.");
      toast.success(isNew ? "Welcome — let's set up your profile" : "Welcome back");
      window.location.href = buildSchoolUrl(schoolSlug, isNew ? "/bio" : "/app");
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-muted">
        <button type="button" onClick={() => setMode("signin")} className={`text-sm py-1.5 rounded-md transition ${mode === "signin" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>Sign in</button>
        <button type="button" onClick={() => setMode("signup")} className={`text-sm py-1.5 rounded-md transition ${mode === "signup" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>First time</button>
      </div>

      {mode === "signup" && (
        <>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><User className="size-3.5" /> Full name</Label>
            <Input required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Ada Lovelace" />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-1.5"><Hash className="size-3.5" /> School code</Label>
            <Input required value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="GREEN-STU-AB12" />
            <p className="text-[11px] text-muted-foreground">Get this once from your school admin.</p>
          </div>
        </>
      )}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5"><Phone className="size-3.5" /> Phone number</Label>
        <Input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+233 555 000 000" />
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5"><KeyRound className="size-3.5" /> PIN (4–6 digits)</Label>
        <Input required inputMode="numeric" pattern="\d{4,6}" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} placeholder="••••" />
        <p className="text-[11px] text-muted-foreground">{mode === "signup" ? "You'll use this PIN to sign in next time." : "Enter the PIN you set when you first joined."}</p>
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin" />} {mode === "signup" ? "Join school" : "Sign in"}
      </Button>
    </form>
  );
}

function AdminAuth({ busy, setBusy }: { busy: boolean; setBusy: (b: boolean) => void }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/onboarding`, data: { full_name: fullName } },
        });
        if (error) throw error;
      }
      toast.success(mode === "signup" ? "Account created" : "Welcome back");
      navigate("/onboarding", { replace: true });
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-muted">
        <button type="button" onClick={() => setMode("signin")} className={`text-sm py-1.5 rounded-md transition ${mode === "signin" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>Sign in</button>
        <button type="button" onClick={() => setMode("signup")} className={`text-sm py-1.5 rounded-md transition ${mode === "signup" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>Create school admin</button>
      </div>
      {mode === "signup" && <div className="space-y-2"><Label>Full name</Label><Input required value={fullName} onChange={e => setFullName(e.target.value)} /></div>}
      <div className="space-y-2"><Label>Email</Label><Input required type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div className="space-y-2"><Label>Password</Label><Input required type="password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} /></div>
      <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} {mode === "signup" ? "Create account" : "Sign in"}</Button>
    </form>
  );
}
