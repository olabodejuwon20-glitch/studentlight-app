import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, Loader2, Phone, KeyRound, Hash, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function Auth() {
  const navigate = useNavigate();
  const { session, loading } = useSchool();
  const [tab, setTab] = useState<"member" | "admin">("member");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (session) navigate("/onboarding", { replace: true }); }, [session, navigate]);
  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;

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
          <h2 className="font-display text-4xl font-bold leading-tight">One platform.<br/>Every school.</h2>
          <p className="text-white/85">Teachers, students and parents sign in with their school code. Admins use email and password.</p>
        </div>
        <div className="relative text-xs opacity-70">© 2026 EduSmart</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <Card className="w-full max-w-md p-8">
          <Link to="/" className="mb-6 lg:hidden flex items-center gap-2">
            <div className="grid place-items-center size-9 rounded-lg bg-primary text-primary-foreground"><GraduationCap className="size-5" /></div>
            <span className="font-display font-bold text-lg">EduSmart</span>
          </Link>
          <h1 className="font-display text-2xl font-bold tracking-tight">Sign in to your portal</h1>
          <p className="text-sm text-muted-foreground mt-1">Choose how you access EduSmart.</p>

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-6">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="member">Teacher / Student / Parent</TabsTrigger>
              <TabsTrigger value="admin">Admin</TabsTrigger>
            </TabsList>

            <TabsContent value="member" className="mt-6">
              <MemberAuth busy={busy} setBusy={setBusy} />
            </TabsContent>

            <TabsContent value="admin" className="mt-6">
              <AdminAuth busy={busy} setBusy={setBusy} />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

function MemberAuth({ busy, setBusy }: { busy: boolean; setBusy: (b: boolean) => void }) {
  const navigate = useNavigate();
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
        body: { mode, fullName, phone, code, pin },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const email = (data as any).email as string;
      const schoolSlug = (data as any).schoolSlug as string;
      const isNew = !!(data as any).isNew;

      const { error: sErr } = await supabase.auth.signInWithPassword({ email, password: pin });
      if (sErr) throw new Error("PIN doesn't match. Try again.");

      toast.success(isNew ? "Account created" : "Welcome back");
      const url = new URL(window.location.href);
      url.searchParams.set("school", schoolSlug);
      url.pathname = isNew ? "/bio" : "/app";
      window.location.href = url.toString();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-muted">
        <button type="button" onClick={() => setMode("signin")} className={`text-sm py-1.5 rounded-md transition ${mode === "signin" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>Sign in</button>
        <button type="button" onClick={() => setMode("signup")} className={`text-sm py-1.5 rounded-md transition ${mode === "signup" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>First time</button>
      </div>

      {mode === "signup" && (
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5"><User className="size-3.5" /> Full name</Label>
          <Input required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Ada Lovelace" />
        </div>
      )}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5"><Phone className="size-3.5" /> Phone number</Label>
        <Input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+233 555 000 000" />
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5"><Hash className="size-3.5" /> School code</Label>
        <Input required value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="GREEN-STU-AB12" />
      </div>
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5"><KeyRound className="size-3.5" /> PIN (4–6 digits)</Label>
        <Input required inputMode="numeric" pattern="\d{4,6}" maxLength={6} value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} placeholder="••••" />
        <p className="text-[11px] text-muted-foreground">{mode === "signup" ? "You'll use this PIN to sign in next time." : "Enter the PIN you set when you first joined."}</p>
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy && <Loader2 className="size-4 animate-spin" />} {mode === "signup" ? "Join school" : "Sign in"}
      </Button>
      <p className="text-[11px] text-muted-foreground text-center">Don't have a school code? Ask your school admin.</p>
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
        toast.success("Welcome back");
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/onboarding`, data: { full_name: fullName } },
        });
        if (error) throw error;
        toast.success("Account created");
      }
      navigate("/onboarding", { replace: true });
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-muted">
        <button type="button" onClick={() => setMode("signin")} className={`text-sm py-1.5 rounded-md transition ${mode === "signin" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>Sign in</button>
        <button type="button" onClick={() => setMode("signup")} className={`text-sm py-1.5 rounded-md transition ${mode === "signup" ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}>Create school admin</button>
      </div>
      {mode === "signup" && (
        <div className="space-y-2"><Label>Full name</Label><Input required value={fullName} onChange={e => setFullName(e.target.value)} /></div>
      )}
      <div className="space-y-2"><Label>Email</Label><Input required type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
      <div className="space-y-2"><Label>Password</Label><Input required type="password" minLength={6} value={password} onChange={e => setPassword(e.target.value)} /></div>
      <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} {mode === "signup" ? "Create account" : "Sign in"}</Button>
    </form>
  );
}
