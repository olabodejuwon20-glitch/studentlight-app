import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { GraduationCap, Loader2, ShieldCheck, Users, BookOpen, UserSquare2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Role, ROLE_META, useRole } from "@/contexts/RoleContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS: { value: Role; title: string; desc: string; icon: any }[] = [
  { value: "admin",   title: "Admin",   desc: "Run the school", icon: ShieldCheck },
  { value: "teacher", title: "Teacher", desc: "Manage classes", icon: BookOpen },
  { value: "student", title: "Student", desc: "Learn & explore", icon: Users },
  { value: "parent",  title: "Parent",  desc: "Track your child", icon: UserSquare2 },
];

export default function Auth() {
  const navigate = useNavigate();
  const { session, loading } = useRole();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);

  // sign in
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // sign up
  const [fullName, setFullName] = useState("");
  const [emailUp, setEmailUp] = useState("");
  const [passwordUp, setPasswordUp] = useState("");
  const [role, setRole] = useState<Role>("student");

  useEffect(() => {
    if (session) navigate("/", { replace: true });
  }, [session, navigate]);

  if (loading) {
    return <div className="min-h-screen grid place-items-center bg-background"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  }
  if (session) return <Navigate to="/" replace />;

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Welcome back!");
    navigate("/", { replace: true });
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: emailUp,
      password: passwordUp,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: fullName },
      },
    });
    if (error) { setBusy(false); return toast.error(error.message); }
    if (data.user) {
      const { error: rErr } = await supabase.from("user_roles").insert({ user_id: data.user.id, role });
      if (rErr) { setBusy(false); return toast.error(rErr.message); }
    }
    setBusy(false);
    toast.success("Account created — welcome to EduSmart!");
    navigate("/", { replace: true });
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between p-10 bg-gradient-to-br from-[hsl(var(--admin))] via-[hsl(var(--student))] to-[hsl(var(--teacher))] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: "radial-gradient(circle at 20% 20%, white 1px, transparent 1px)", backgroundSize: "24px 24px" }} />
        <div className="relative flex items-center gap-3">
          <div className="grid place-items-center size-11 rounded-xl bg-white/20 backdrop-blur"><GraduationCap className="size-6" /></div>
          <div>
            <div className="font-display font-bold text-xl leading-none">EduSmart</div>
            <div className="text-xs opacity-80 mt-1">School Management Platform</div>
          </div>
        </div>
        <div className="relative space-y-4 max-w-md">
          <h2 className="font-display text-4xl font-bold leading-tight">One platform.<br/>Every role.</h2>
          <p className="text-white/85">Admins, teachers, students and parents — all working together in one beautifully simple workspace.</p>
          <div className="grid grid-cols-2 gap-3 pt-4">
            {ROLE_OPTIONS.map(r => (
              <div key={r.value} className="rounded-xl border border-white/20 bg-white/10 backdrop-blur p-3">
                <r.icon className="size-5 mb-2" />
                <div className="text-sm font-semibold">{r.title}</div>
                <div className="text-[11px] opacity-80">{r.desc}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-xs opacity-70">© 2026 EduSmart. All rights reserved.</div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <Card className="w-full max-w-md p-8 shadow-sm">
          <div className="mb-6 lg:hidden flex items-center gap-2">
            <div className="grid place-items-center size-9 rounded-lg bg-primary text-primary-foreground"><GraduationCap className="size-5" /></div>
            <span className="font-display font-bold text-lg">EduSmart</span>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {tab === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tab === "signin" ? "Sign in to continue to your portal." : "Pick a role and get started in seconds."}
          </p>

          <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mt-6">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-6">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin" />} Sign in
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-6">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full name</Label>
                  <Input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailUp">Email</Label>
                  <Input id="emailUp" type="email" required value={emailUp} onChange={(e) => setEmailUp(e.target.value)} placeholder="you@school.edu" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="passwordUp">Password</Label>
                  <Input id="passwordUp" type="password" required minLength={6} value={passwordUp} onChange={(e) => setPasswordUp(e.target.value)} placeholder="At least 6 characters" />
                </div>
                <div className="space-y-2">
                  <Label>I am a…</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {ROLE_OPTIONS.map(r => {
                      const selected = role === r.value;
                      return (
                        <button
                          type="button"
                          key={r.value}
                          onClick={() => setRole(r.value)}
                          className={cn(
                            "rounded-xl border p-3 text-left transition-all hover:shadow-sm",
                            selected ? "border-transparent ring-2 ring-offset-2 ring-offset-background" : "border-border hover:border-foreground/20"
                          )}
                          style={selected ? { boxShadow: `0 0 0 2px ${ROLE_META[r.value].color}` } : {}}
                        >
                          <div className="flex items-center gap-2">
                            <span className="grid place-items-center size-7 rounded-md text-white" style={{ background: ROLE_META[r.value].color }}>
                              <r.icon className="size-4" />
                            </span>
                            <span className="text-sm font-semibold">{r.title}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-1">{r.desc}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="size-4 animate-spin" />} Create account
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-xs text-muted-foreground text-center mt-6">
            By continuing you agree to EduSmart's Terms & Privacy.
          </p>
        </Card>
      </div>
    </div>
  );
}