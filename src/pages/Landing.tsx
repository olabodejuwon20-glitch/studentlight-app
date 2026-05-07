import { Link, useNavigate } from "react-router-dom";
import { GraduationCap, ShieldCheck, Users, BookOpen, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSchool } from "@/contexts/SchoolContext";

export default function Landing() {
  const navigate = useNavigate();
  const { user } = useSchool();

  const features = [
    { icon: ShieldCheck, title: "Secure & isolated", desc: "Each school's data is fully separated with row-level security." },
    { icon: Users,       title: "Built for everyone",desc: "Admins, teachers, students and parents in one place." },
    { icon: BookOpen,    title: "Classes & exams",   desc: "Manage classes, attendance, CBT exams and grading." },
    { icon: Sparkles,    title: "AI tutor",          desc: "Students learn faster with built-in AI assistance." },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid place-items-center size-9 rounded-lg bg-primary text-primary-foreground"><GraduationCap className="size-5" /></div>
            <span className="font-display font-bold text-lg">EduSmart</span>
          </div>
          <div className="flex items-center gap-2">
            {user
              ? <Button onClick={() => navigate("/app")}>Open dashboard</Button>
              : <>
                  <Button variant="ghost" onClick={() => navigate("/auth")}>Sign in</Button>
                  <Button onClick={() => navigate("/register")}>Register your school</Button>
                </>}
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-20 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-secondary text-secondary-foreground">
            <Sparkles className="size-3.5" /> Multi-tenant school management
          </div>
          <h1 className="font-display text-5xl lg:text-6xl font-bold tracking-tight mt-6 leading-[1.05]">
            Run your school<br /><span className="text-primary">on one platform.</span>
          </h1>
          <p className="text-lg text-muted-foreground mt-6 max-w-lg">
            EduSmart gives every school its own secure workspace — students, teachers, parents and admins working together with data that's fully isolated per school.
          </p>
          <div className="mt-8 flex gap-3">
            <Button size="lg" onClick={() => navigate(user ? "/app" : "/register")}>
              {user ? "Continue setup" : "Create your school"} <ArrowRight className="size-4 ml-1" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/join")}>I have a code</Button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-card p-6">
          <div className="grid grid-cols-2 gap-4">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border border-border p-4 bg-background/40">
                <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center"><f.icon className="size-5" /></div>
                <div className="mt-3 font-semibold text-sm">{f.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-6 text-xs text-muted-foreground flex justify-between">
          <span>© 2026 EduSmart</span>
          <Link to="/auth" className="hover:text-foreground">Sign in</Link>
        </div>
      </footer>
    </div>
  );
}
