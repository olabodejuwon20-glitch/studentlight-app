import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Wallet, ClipboardCheck,
  BarChart3, MessagesSquare, CalendarDays, FileText, Bell, Search,
  CheckCircle2, Clock, TrendingUp, Award, Baby, UserCog,
} from "lucide-react";

type PortalKey = "admin" | "teacher" | "student" | "parent";

const PORTALS: { key: PortalKey; label: string; subtitle: string; color: string }[] = [
  { key: "admin",   label: "Admin",   subtitle: "School Management", color: "hsl(var(--admin))" },
  { key: "teacher", label: "Teacher", subtitle: "Classroom",         color: "hsl(var(--teacher))" },
  { key: "student", label: "Student", subtitle: "Learning",          color: "hsl(var(--student))" },
  { key: "parent",  label: "Parent",  subtitle: "Family Hub",        color: "hsl(var(--parent))" },
];

function Frame({ accent, sidebar, children }: { accent: string; sidebar: { icon: any; label: string; active?: boolean }[]; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-background overflow-hidden shadow-card">
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-muted/40">
        <span className="size-2.5 rounded-full bg-destructive/60" />
        <span className="size-2.5 rounded-full bg-warning/60" />
        <span className="size-2.5 rounded-full bg-success/60" />
        <div className="ml-3 flex-1 max-w-sm h-5 rounded-md bg-background border border-border px-2 flex items-center text-[10px] text-muted-foreground">
          legacyskool.app/demo
        </div>
      </div>
      <div className="grid grid-cols-[160px_1fr] min-h-[380px]">
        {/* Sidebar */}
        <aside className="border-r border-border bg-muted/30 p-3 text-xs">
          <div className="flex items-center gap-2 mb-4">
            <div className="size-7 rounded-md grid place-items-center text-white" style={{ background: accent }}>
              <GraduationCap className="size-4" />
            </div>
            <span className="font-semibold">Legacyskool</span>
          </div>
          <nav className="space-y-1">
            {sidebar.map((i) => (
              <div key={i.label}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-md ${i.active ? "text-foreground font-medium" : "text-muted-foreground"}`}
                style={i.active ? { background: `${accent.replace(")", " / 0.12)").replace("hsl(", "hsl(")}` } : {}}>
                <i.icon className="size-3.5" />
                <span>{i.label}</span>
              </div>
            ))}
          </nav>
        </aside>
        {/* Content */}
        <div className="p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}

function Stat({ label, value, trend, color }: { label: string; value: string; trend?: string; color: string }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-display text-xl font-bold mt-1" style={{ color }}>{value}</div>
      {trend && <div className="text-[10px] text-success mt-0.5 flex items-center gap-1"><TrendingUp className="size-3" />{trend}</div>}
    </div>
  );
}

function AdminDemo() {
  return (
    <Frame accent="hsl(var(--admin))" sidebar={[
      { icon: LayoutDashboard, label: "Dashboard", active: true },
      { icon: Users, label: "Students" },
      { icon: UserCog, label: "Teachers" },
      { icon: BookOpen, label: "Classes" },
      { icon: Wallet, label: "Fees" },
      { icon: BarChart3, label: "Reports" },
    ]}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-xs text-muted-foreground">School Overview</div>
          <h3 className="font-display font-bold text-lg">Greenfield Academy</h3>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Bell className="size-4" /><Search className="size-4" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Stat label="Students" value="1,248" trend="+12 this week" color="hsl(var(--admin))" />
        <Stat label="Teachers" value="86" color="hsl(var(--admin))" />
        <Stat label="Classes" value="42" color="hsl(var(--admin))" />
        <Stat label="Fees paid" value="92%" trend="+4.1%" color="hsl(var(--admin))" />
      </div>
      <div className="mt-4 rounded-lg border border-border p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold">Enrollment by class</div>
          <span className="text-[10px] text-muted-foreground">Last 30 days</span>
        </div>
        <div className="flex items-end gap-1.5 h-20">
          {[60, 75, 50, 85, 70, 90, 65, 80, 95, 72, 88, 78].map((h, i) => (
            <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, background: "hsl(var(--admin) / 0.7)" }} />
          ))}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-border p-2 flex items-center gap-2"><CheckCircle2 className="size-4 text-success" />Term reports approved</div>
        <div className="rounded-lg border border-border p-2 flex items-center gap-2"><Clock className="size-4 text-warning" />3 fee reminders pending</div>
      </div>
    </Frame>
  );
}

function TeacherDemo() {
  return (
    <Frame accent="hsl(var(--teacher))" sidebar={[
      { icon: LayoutDashboard, label: "Dashboard", active: true },
      { icon: BookOpen, label: "Classes" },
      { icon: ClipboardCheck, label: "Attendance" },
      { icon: FileText, label: "Tests" },
      { icon: Award, label: "Gradebook" },
      { icon: MessagesSquare, label: "Messages" },
    ]}>
      <div className="mb-3">
        <div className="text-xs text-muted-foreground">Good morning,</div>
        <h3 className="font-display font-bold text-lg">Mr. Okonkwo · JSS 2A</h3>
      </div>
      <div className="rounded-lg border border-border p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold">Today's attendance</div>
          <span className="text-[10px] text-muted-foreground">28 students</span>
        </div>
        <div className="space-y-1.5">
          {[
            { n: "Ada Obi", s: "Present" },
            { n: "Bola Ade", s: "Present" },
            { n: "Chika Eze", s: "Late" },
            { n: "Dapo Ola", s: "Absent" },
          ].map((r) => (
            <div key={r.n} className="flex items-center justify-between text-xs">
              <span>{r.n}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                r.s === "Present" ? "bg-success/15 text-success" :
                r.s === "Late" ? "bg-warning/15 text-warning" : "bg-destructive/15 text-destructive"
              }`}>{r.s}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border p-3">
          <div className="text-[10px] uppercase text-muted-foreground">Next class</div>
          <div className="text-sm font-semibold mt-1">Mathematics</div>
          <div className="text-[10px] text-muted-foreground">10:30 AM · Room B12</div>
        </div>
        <div className="rounded-lg border border-border p-3">
          <div className="text-[10px] uppercase text-muted-foreground">To grade</div>
          <div className="text-sm font-semibold mt-1">12 assignments</div>
          <div className="text-[10px] text-muted-foreground">Algebra Test · JSS 2A</div>
        </div>
      </div>
    </Frame>
  );
}

function StudentDemo() {
  return (
    <Frame accent="hsl(var(--student))" sidebar={[
      { icon: LayoutDashboard, label: "Dashboard", active: true },
      { icon: BookOpen, label: "Classes" },
      { icon: FileText, label: "Exams" },
      { icon: Award, label: "Results" },
      { icon: CalendarDays, label: "Calendar" },
      { icon: MessagesSquare, label: "AI Tutor" },
    ]}>
      <div className="mb-3">
        <div className="text-xs text-muted-foreground">Welcome back,</div>
        <h3 className="font-display font-bold text-lg">Ada Obi · JSS 2A</h3>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Stat label="Average" value="84%" trend="+3%" color="hsl(var(--student))" />
        <Stat label="Attendance" value="96%" color="hsl(var(--student))" />
        <Stat label="Rank" value="4/28" color="hsl(var(--student))" />
      </div>
      <div className="mt-3 rounded-lg border border-border p-3">
        <div className="text-xs font-semibold mb-2">Upcoming</div>
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><FileText className="size-3.5 text-student" />Mathematics CBT</div>
            <span className="text-[10px] text-muted-foreground">Tomorrow · 10:00</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><BookOpen className="size-3.5 text-student" />English assignment</div>
            <span className="text-[10px] text-muted-foreground">Fri</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><Award className="size-3.5 text-student" />Mid-term results</div>
            <span className="text-[10px] text-muted-foreground">Next week</span>
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-lg p-3 text-xs text-white" style={{ background: "linear-gradient(135deg, hsl(var(--student)), hsl(var(--admin)))" }}>
        <div className="font-semibold">Ask the AI tutor</div>
        <div className="opacity-90 mt-0.5">Stuck on quadratic equations? Get instant help.</div>
      </div>
    </Frame>
  );
}

function ParentDemo() {
  return (
    <Frame accent="hsl(var(--parent))" sidebar={[
      { icon: LayoutDashboard, label: "Dashboard", active: true },
      { icon: Baby, label: "My Children" },
      { icon: Award, label: "Results" },
      { icon: ClipboardCheck, label: "Attendance" },
      { icon: Wallet, label: "Fees" },
      { icon: MessagesSquare, label: "Messages" },
    ]}>
      <div className="mb-3">
        <div className="text-xs text-muted-foreground">Family overview</div>
        <h3 className="font-display font-bold text-lg">Mrs. Boateng</h3>
      </div>
      <div className="rounded-lg border border-border p-3 mb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-full grid place-items-center text-white text-xs font-semibold" style={{ background: "hsl(var(--parent))" }}>AO</div>
            <div>
              <div className="text-sm font-semibold">Ama Obi</div>
              <div className="text-[10px] text-muted-foreground">JSS 2A · Greenfield Academy</div>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success">Present today</span>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3">
          <Stat label="Average" value="84%" color="hsl(var(--parent))" />
          <Stat label="Attendance" value="96%" color="hsl(var(--parent))" />
          <Stat label="Fees" value="Paid" color="hsl(var(--parent))" />
        </div>
      </div>
      <div className="rounded-lg border border-border p-3">
        <div className="text-xs font-semibold mb-2">Recent updates</div>
        <div className="space-y-2 text-xs">
          <div className="flex items-start gap-2"><Award className="size-3.5 text-parent mt-0.5" /><div><div>Maths test result: <b>92%</b></div><div className="text-[10px] text-muted-foreground">Posted by Mr. Okonkwo · 2h ago</div></div></div>
          <div className="flex items-start gap-2"><Bell className="size-3.5 text-parent mt-0.5" /><div><div>PTA meeting on Friday</div><div className="text-[10px] text-muted-foreground">School announcement · 1d ago</div></div></div>
        </div>
      </div>
    </Frame>
  );
}

const DEMOS: Record<PortalKey, () => JSX.Element> = {
  admin: AdminDemo,
  teacher: TeacherDemo,
  student: StudentDemo,
  parent: ParentDemo,
};

export default function PortalDemo() {
  const [active, setActive] = useState<PortalKey>("admin");
  const Demo = DEMOS[active];
  const activeMeta = PORTALS.find(p => p.key === active)!;

  return (
    <section id="demo" className="border-b border-border/60 bg-muted/20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-20">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-background border border-border">
            <span className="size-1.5 rounded-full bg-success animate-pulse" /> Live interactive demo
          </div>
          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight mt-4">See every portal in action</h2>
          <p className="text-muted-foreground mt-3">Switch between Admin, Teacher, Student and Parent to explore what each role sees.</p>
        </div>

        {/* Tabs */}
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          {PORTALS.map((p) => {
            const isActive = p.key === active;
            return (
              <button
                key={p.key}
                onClick={() => setActive(p.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                  isActive
                    ? "text-white border-transparent shadow-card"
                    : "bg-background text-muted-foreground border-border hover:text-foreground"
                }`}
                style={isActive ? { background: p.color } : {}}
              >
                {p.label}
                <span className={`ml-2 text-[10px] ${isActive ? "opacity-80" : "opacity-60"}`}>{p.subtitle}</span>
              </button>
            );
          })}
        </div>

        {/* Demo frame */}
        <div className="mt-6 relative">
          <div className="absolute -inset-4 rounded-3xl blur-2xl opacity-30" style={{ background: activeMeta.color }} />
          <div className="relative max-w-4xl mx-auto">
            <Demo />
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">Ready to set this up for your school?</p>
          <div className="mt-3 flex flex-wrap gap-3 justify-center">
            <Button asChild><a href="/register">Get started free</a></Button>
            <Button variant="outline" asChild><a href="/signin">Sign in</a></Button>
          </div>
        </div>
      </div>
    </section>
  );
}