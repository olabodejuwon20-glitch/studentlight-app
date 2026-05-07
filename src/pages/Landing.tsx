import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, ShieldCheck, Users, BookOpen, Sparkles, ArrowRight, Building2, LogIn, UserPlus, Globe2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSchool } from "@/contexts/SchoolContext";
import { schoolPath, getCurrentSchoolSlug } from "@/lib/tenant";

export default function Landing() {
  const navigate = useNavigate();
  const { user, school } = useSchool();
  const slug = school?.slug ?? getCurrentSchoolSlug();

  const features = [
    { icon: ShieldCheck, title: "Tenant-isolated",  desc: "Every school has its own private workspace and data perimeter." },
    { icon: Users,       title: "Four roles, one app", desc: "Admins, teachers, students and parents collaborate seamlessly." },
    { icon: BookOpen,    title: "Classes & CBT exams", desc: "Manage classes, attendance, computer-based tests and grading." },
    { icon: Sparkles,    title: "AI tutor built-in",   desc: "Students learn faster with an integrated AI study companion." },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/60 backdrop-blur sticky top-0 z-30 bg-background/80">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid place-items-center size-9 rounded-lg bg-primary text-primary-foreground"><GraduationCap className="size-5" /></div>
            <span className="font-display font-bold text-lg tracking-tight">EduSmart</span>
          </Link>
          <div className="flex items-center gap-2">
            {user
              ? <Button onClick={() => navigate(schoolPath(slug, "/app"))}>Open dashboard</Button>
              : <>
                  <Button variant="ghost" onClick={() => navigate("/signin")}><LogIn className="size-4 mr-1.5" />Sign in</Button>
                  <Button onClick={() => navigate("/register")}><UserPlus className="size-4 mr-1.5" />Register school</Button>
                </>}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-40"
          style={{ backgroundImage: "radial-gradient(circle at 15% 10%, hsl(var(--admin)/0.25), transparent 40%), radial-gradient(circle at 85% 0%, hsl(var(--student)/0.25), transparent 45%), radial-gradient(circle at 50% 100%, hsl(var(--teacher)/0.2), transparent 50%)" }} />
        <div className="mx-auto max-w-7xl px-6 pt-20 pb-16 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-secondary/80 text-secondary-foreground border border-border">
              <Sparkles className="size-3.5 text-primary" /> Multi-tenant school OS
            </div>
            <h1 className="font-display text-5xl lg:text-6xl font-bold tracking-tight mt-6 leading-[1.05]">
              One platform.<br />
              <span className="bg-gradient-to-r from-[hsl(var(--admin))] via-[hsl(var(--student))] to-[hsl(var(--teacher))] bg-clip-text text-transparent">Every school, its own portal.</span>
            </h1>
            <p className="text-lg text-muted-foreground mt-6 max-w-lg">
              EduSmart gives each school a private, branded workspace. Register once and instantly get a unique URL to onboard your teachers, students and parents.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate("/register")}>
                Register your school <ArrowRight className="size-4 ml-1.5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/signin")}>
                <LogIn className="size-4 mr-1.5" /> Admin sign in
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1.5">
              <KeyRound className="size-3.5" /> Teachers, students & parents sign in from their school's portal URL.
            </p>
          </div>

          {/* Feature card */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/10 via-transparent to-primary/10 rounded-3xl blur-2xl" />
            <div className="relative rounded-2xl border border-border bg-card/80 backdrop-blur shadow-card p-6">
              <div className="grid grid-cols-2 gap-4">
                {features.map((f) => (
                  <div key={f.title} className="rounded-xl border border-border/60 p-4 bg-background/40 hover:bg-background/70 transition-colors">
                    <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center"><f.icon className="size-5" /></div>
                    <div className="mt-3 font-semibold text-sm">{f.title}</div>
                    <div className="text-xs text-muted-foreground mt-1 leading-relaxed">{f.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display text-3xl font-bold tracking-tight">How EduSmart works</h2>
            <p className="text-muted-foreground mt-3">Three steps from sign-up to a fully running school portal.</p>
          </div>
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            {[
              { n: "01", icon: Building2, t: "Register your school", d: "Create your admin account. We provision a unique portal URL for your school." },
              { n: "02", icon: Globe2,    t: "Share your portal link", d: "Send your unique URL to staff and families. They sign in only from there." },
              { n: "03", icon: Users,     t: "Onboard with codes", d: "Generate role-specific codes (with usage limits) so members can self-onboard." },
            ].map(s => (
              <div key={s.n} className="rounded-xl border border-border bg-background p-6">
                <div className="flex items-center justify-between">
                  <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center"><s.icon className="size-5" /></div>
                  <span className="font-display font-bold text-2xl text-muted-foreground/40">{s.n}</span>
                </div>
                <div className="mt-4 font-semibold">{s.t}</div>
                <p className="text-sm text-muted-foreground mt-1.5">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-6 text-xs text-muted-foreground flex justify-between">
          <span>© 2026 EduSmart</span>
          <Link to="/signin" className="hover:text-foreground">Admin sign in</Link>
        </div>
      </footer>
    </div>
  );
}