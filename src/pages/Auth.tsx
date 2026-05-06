import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { GraduationCap, Loader2 } from "lucide-react";
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
  const [params] = useSearchParams();
  const { session, loading } = useSchool();
  const [tab, setTab] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const [busy, setBusy] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");

  useEffect(() => { if (session) navigate("/onboarding", { replace: true }); }, [session, navigate]);

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate("/onboarding", { replace: true });
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/onboarding`, data: { full_name: fullName } },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Account created");
    navigate("/onboarding", { replace: true });
  }

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
          <p className="text-white/85">Each school gets its own secure workspace. Your data stays isolated, your branding stays yours.</p>
        </div>
        <div className="relative text-xs opacity-70">© 2026 EduSmart</div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <Card className="w-full max-w-md p-8">
          <Link to="/" className="mb-6 lg:hidden flex items-center gap-2">
            <div className="grid place-items-center size-9 rounded-lg bg-primary text-primary-foreground"><GraduationCap className="size-5" /></div>
            <span className="font-display font-bold text-lg">EduSmart</span>
          </Link>
          <h1 className="font-display text-2xl font-bold tracking-tight">{tab === "signin" ? "Welcome back" : "Create your account"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tab === "signin" ? "Sign in to your school portal." : "After signup you can create or join a school."}
          </p>

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-6">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} /></div>
                <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} Sign in</Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2"><Label htmlFor="fn">Full name</Label><Input id="fn" required value={fullName} onChange={e => setFullName(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="emailUp">Email</Label><Input id="emailUp" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="pwUp">Password</Label><Input id="pwUp" type="password" minLength={6} required value={password} onChange={e => setPassword(e.target.value)} /></div>
                <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />} Create account</Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
