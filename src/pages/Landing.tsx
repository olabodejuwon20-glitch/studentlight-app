import { Link, useNavigate } from "react-router-dom";
import {
  GraduationCap, ShieldCheck, Users, BookOpen, Sparkles, ArrowRight, Building2,
  LogIn, UserPlus, Globe2, ClipboardCheck, Wallet, MessagesSquare, BarChart3,
  Star, Quote, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSchool } from "@/contexts/SchoolContext";
import { schoolPath, getCurrentSchoolSlug } from "@/lib/tenant";
import SEO from "@/components/SEO";
import PortalDemo from "@/components/landing/PortalDemo";

export default function Landing() {
  const navigate = useNavigate();
  const { user, school } = useSchool();
  const slug = school?.slug ?? getCurrentSchoolSlug();

  const features = [
    { icon: ClipboardCheck, title: "Attendance & timetables", desc: "Daily attendance, class schedules and reminders in one place." },
    { icon: BookOpen,       title: "CBT exams & grading",     desc: "Build assessments, run secure tests and grade in minutes." },
    { icon: BarChart3,      title: "Performance analytics",   desc: "Track results, trends and progress at a glance." },
    { icon: Wallet,         title: "Fees & invoicing",        desc: "Issue, track and collect school fees without spreadsheets." },
    { icon: MessagesSquare, title: "Parent communication",    desc: "Send announcements, results and updates to families." },
    { icon: Sparkles,       title: "AI study tutor",          desc: "Students get instant explanations and study help." },
  ];

  const stories = [
    { school: "Greenfield Academy", stat: "+38%", label: "exam pass-rate in one term", body: "Replaced paper registers and result sheets across 24 classrooms." },
    { school: "St. Mary's College", stat: "12 hrs", label: "saved per teacher weekly", body: "Automated grading and report cards freed teachers for teaching." },
    { school: "Bright Stars School", stat: "98%", label: "fee collection rate", body: "Parents now pay on time with reminders and digital receipts." },
  ];

  const reviews = [
    { name: "Mrs. Adeyemi", role: "Head, Greenfield Academy", body: "Onboarding 600 students took an afternoon. The portal feels like ours, not a tool." },
    { name: "Mr. Okonkwo",  role: "Principal, St. Mary's", body: "Exam day used to be chaos. Now everything — questions, scoring, results — runs itself." },
    { name: "Ama Boateng",  role: "Parent",              body: "I see my daughter's attendance and results the moment they're posted. Game-changer." },
  ];

  const partners = ["Greenfield", "St. Mary's", "Bright Stars", "Unity High", "Heritage", "Crestview"];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Legacyskool — School Management Platform for Africa"
        description="Run your school with Legacyskool — attendance, CBT exams, grading, results, fees and parent communication in one secure portal."
        path="/"
      />
      {/* Header */}
      <header className="border-b border-border/60 backdrop-blur sticky top-0 z-30 bg-background/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid place-items-center size-9 rounded-lg bg-primary text-primary-foreground"><GraduationCap className="size-5" /></div>
            <span className="font-display font-bold text-lg tracking-tight">Legacyskool</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#demo" className="hover:text-foreground">Demo</a>
            <a href="#stories" className="hover:text-foreground">Success stories</a>
            <a href="#reviews" className="hover:text-foreground">Reviews</a>
          </nav>
          <div className="flex items-center gap-2">
            {user
              ? <Button size="sm" onClick={() => navigate(schoolPath(slug, "/app"))}>Open dashboard</Button>
              : <>
                  <Button size="sm" variant="ghost" onClick={() => navigate("/signin")}><LogIn className="size-4 mr-1.5" />Sign in</Button>
                  <Button size="sm" onClick={() => navigate("/register")}><UserPlus className="size-4 mr-1.5" />Get started</Button>
                </>}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-40"
          style={{ backgroundImage: "radial-gradient(circle at 15% 10%, hsl(var(--admin)/0.25), transparent 40%), radial-gradient(circle at 85% 0%, hsl(var(--student)/0.25), transparent 45%), radial-gradient(circle at 50% 100%, hsl(var(--teacher)/0.2), transparent 50%)" }} />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-16 sm:pt-20 pb-14 sm:pb-16 grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-secondary/80 text-secondary-foreground border border-border">
              <Sparkles className="size-3.5 text-primary" /> The complete school operating system
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mt-6 leading-[1.05]">
              Run your school.<br />
              <span className="bg-gradient-to-r from-[hsl(var(--admin))] via-[hsl(var(--student))] to-[hsl(var(--teacher))] bg-clip-text text-transparent">All in one place.</span>
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-5 sm:mt-6 max-w-lg">
              Admissions, attendance, exams, grading, fees, and parent communication — built for modern schools.
            </p>
            <div className="mt-7 sm:mt-8 flex flex-wrap gap-3">
              <Button size="lg" onClick={() => navigate("/register")}>
                Get started free <ArrowRight className="size-4 ml-1.5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/signin")}>
                <LogIn className="size-4 mr-1.5" /> Sign in
              </Button>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-success" /> No card required</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-success" /> Setup in minutes</span>
              <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-3.5 text-success" /> Cancel anytime</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-primary/10 via-transparent to-primary/10 rounded-3xl blur-2xl" />
            <div className="relative rounded-2xl border border-border bg-card/80 backdrop-blur shadow-card p-5 sm:p-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {features.slice(0, 4).map((f) => (
                  <div key={f.title} className="rounded-xl border border-border/60 p-3 sm:p-4 bg-background/40">
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

      {/* Trusted by */}
      <section className="border-y border-border/60 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
          <div className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">Trusted by schools across Africa</div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 sm:gap-x-12 gap-y-3 opacity-70">
            {partners.map(p => (
              <span key={p} className="font-display font-semibold text-base sm:text-lg text-muted-foreground">{p}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-b border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Everything a modern school needs</h2>
            <p className="text-muted-foreground mt-3">From the front office to the classroom and the home — one connected system.</p>
          </div>
          <div className="mt-10 sm:mt-12 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {features.map((f) => (
              <Card key={f.title} className="p-5 sm:p-6">
                <div className="size-11 rounded-xl bg-primary/10 text-primary grid place-items-center"><f.icon className="size-5" /></div>
                <div className="mt-4 font-semibold">{f.title}</div>
                <p className="text-sm text-muted-foreground mt-1.5">{f.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive portal demo */}
      <PortalDemo />

      {/* How it works */}
      <section className="border-b border-border/60 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Up and running in three steps</h2>
            <p className="text-muted-foreground mt-3">Built so you can launch your school in an afternoon.</p>
          </div>
          <div className="mt-10 sm:mt-12 grid md:grid-cols-3 gap-5">
            {[
              { n: "01", icon: Building2, t: "Create your school", d: "Sign up as the admin and we'll set up your private workspace." },
              { n: "02", icon: Globe2,    t: "Share your link",    d: "Send your unique school link to staff and families to sign in." },
              { n: "03", icon: Users,     t: "Onboard with codes", d: "Generate role-based codes — or upload everyone in bulk." },
            ].map(s => (
              <div key={s.n} className="rounded-xl border border-border bg-background p-6">
                <div className="flex items-center justify-between">
                  <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center"><s.icon className="size-5" /></div>
                  <span className="font-display font-bold text-2xl text-muted-foreground">{s.n}</span>
                </div>
                <div className="mt-4 font-semibold">{s.t}</div>
                <p className="text-sm text-muted-foreground mt-1.5">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Success stories */}
      <section id="stories" className="border-b border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Schools winning with Legacyskool</h2>
            <p className="text-muted-foreground mt-3">Real results from real schools.</p>
          </div>
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {stories.map(s => (
              <Card key={s.school} className="p-6">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{s.school}</div>
                <div className="font-display text-4xl font-bold mt-2 bg-gradient-to-r from-[hsl(var(--admin))] to-[hsl(var(--student))] bg-clip-text text-transparent">{s.stat}</div>
                <div className="text-sm font-medium mt-1">{s.label}</div>
                <p className="text-sm text-muted-foreground mt-3">{s.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section id="reviews" className="border-b border-border/60 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Loved by educators and parents</h2>
            <div className="mt-3 flex items-center justify-center gap-1 text-warning">
              {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="size-4 fill-current" />)}
              <span className="ml-2 text-sm text-muted-foreground">4.9 average from 200+ reviews</span>
            </div>
          </div>
          <div className="mt-10 grid md:grid-cols-3 gap-5">
            {reviews.map(r => (
              <Card key={r.name} className="p-6">
                <Quote className="size-5 text-primary/60" />
                <p className="text-sm mt-3 leading-relaxed">"{r.body}"</p>
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="font-semibold text-sm">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.role}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Built for the way schools actually work</h2>
            <p className="text-muted-foreground mt-3">Each school gets its own private workspace. Your data stays yours, and every user signs in only to your portal.</p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Bank-grade security and isolated data per school",
                "Role-based access for admins, teachers, students and parents",
                "Bulk onboarding from CSV — get hundreds of users live in one go",
                "Works on any phone, tablet or computer",
              ].map(t => (
                <li key={t} className="flex items-start gap-2">
                  <ShieldCheck className="size-4 text-success mt-0.5 shrink-0" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <Card className="p-6 sm:p-8">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Ready to start?</div>
            <h3 className="font-display text-2xl font-bold mt-2">Launch your school portal today</h3>
            <p className="text-sm text-muted-foreground mt-2">Free to get started. Be live with staff and students this week.</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={() => navigate("/register")}>Get started <ArrowRight className="size-4 ml-1.5" /></Button>
              <Button variant="outline" onClick={() => navigate("/signin")}>Sign in</Button>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA strip */}
      <section className="bg-gradient-to-br from-[hsl(var(--admin))] via-[hsl(var(--student))] to-[hsl(var(--teacher))] text-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-14 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight">Bring your school online in minutes</h2>
          <p className="mt-3 text-white/90 max-w-xl mx-auto">Join hundreds of schools already saving time and improving outcomes.</p>
          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            <Button size="lg" variant="secondary" onClick={() => navigate("/register")}>Get started free <ArrowRight className="size-4 ml-1.5" /></Button>
            <Button size="lg" variant="outline" className="bg-transparent text-white border-white/40 hover:bg-white/10 hover:text-white" onClick={() => navigate("/signin")}>Admin sign in</Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8 text-xs text-muted-foreground flex flex-col sm:flex-row gap-3 justify-between">
          <span>© 2026 Legacyskool. All rights reserved.</span>
          <div className="flex gap-5">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#stories" className="hover:text-foreground">Stories</a>
            <a href="#reviews" className="hover:text-foreground">Reviews</a>
            <Link to="/signin" className="hover:text-foreground">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
