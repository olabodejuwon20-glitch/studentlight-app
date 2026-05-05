import { Users, ClipboardCheck, Calendar, BookOpen, FileCheck, Upload, UserX, Award, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/StatCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { teacherClasses, todaySchedule, pendingGrading, recentSubmissions } from "@/data/mock";

export default function TeacherDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="My Classes"      value="4"   sub="View all classes" icon={Users} tone="info" />
        <StatCard label="Today's Classes" value="2"   sub="View schedule"    icon={Calendar} tone="success" />
        <StatCard label="Pending Grading" value="18"  sub="View to grade"    icon={ClipboardCheck} tone="warning" />
        <StatCard label="Attendance Today"value="96%" sub="View details"     icon={BookOpen} tone="student" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Today's Schedule" action={<Button variant="link" size="sm" className="text-primary">View Full Schedule</Button>}>
          <ul className="space-y-3">
            {todaySchedule.map((s, i) => (
              <li key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <div className="w-20 text-sm font-semibold text-primary">{s.time}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.klass}</div>
                  <div className="text-xs text-muted-foreground">{s.room}</div>
                </div>
                <Badge variant="outline" className={s.status === "Ongoing" ? "border-success/30 bg-success/10 text-success" : "border-info/30 bg-info/10 text-info"}>{s.status}</Badge>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Recent Activities" action={<Button variant="link" size="sm" className="text-primary">View All</Button>}>
          <ul className="space-y-4">
            {[
              { icon: Upload,    title: "New assignment submitted", desc: "SS2 A - Algebra Homework",    time: "20 mins ago", color: "text-info bg-info/10" },
              { icon: FileCheck, title: "Test marked",              desc: "SS1 B - Quiz 1",              time: "1 hour ago",  color: "text-success bg-success/10" },
              { icon: Award,     title: "Attendance taken",         desc: "SS2 A - Mathematics",         time: "2 hours ago", color: "text-warning bg-warning/10" },
              { icon: BookOpen,  title: "New resource uploaded",    desc: "Quadratic Equations Notes",   time: "3 hours ago", color: "text-student bg-student/10" },
            ].map((a, i) => {
              const Icon = a.icon;
              return (
                <li key={i} className="flex gap-3">
                  <div className={`size-9 rounded-lg grid place-items-center shrink-0 ${a.color}`}><Icon className="size-4" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{a.title}</div>
                    <div className="text-xs text-muted-foreground truncate">{a.desc}</div>
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">{a.time}</span>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      </div>

      <SectionCard title="My Classes" description="Manage your classes" action={<Button><Plus className="size-4 mr-1.5" /> Add New Class</Button>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {teacherClasses.map((c) => (
            <div key={c.code} className="rounded-xl border border-border p-4 hover:border-primary/40 transition-colors">
              <div className="font-display font-semibold">{c.code}</div>
              <div className="text-xs text-muted-foreground">{c.subject}</div>
              <div className="mt-3 text-xs text-muted-foreground">{c.students} Students</div>
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1"><span className="text-muted-foreground">Attendance</span><span className="font-semibold text-success">{c.attendance}%</span></div>
                <div className="h-1.5 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-success" style={{ width: `${c.attendance}%` }} /></div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Pending Grading" action={<Button variant="link" size="sm" className="text-primary">View All</Button>}>
          <table className="w-full text-sm">
            <thead><tr className="text-xs uppercase text-muted-foreground border-b border-border">
              <th className="text-left font-medium py-2">Student</th><th className="text-left font-medium py-2">Class</th>
              <th className="text-left font-medium py-2">Assessment</th><th className="text-left font-medium py-2">Due</th>
            </tr></thead>
            <tbody>
              {pendingGrading.map((p, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="py-2.5 font-medium">{p.student}</td>
                  <td className="py-2.5 text-muted-foreground">{p.class}</td>
                  <td className="py-2.5">{p.assessment}</td>
                  <td className="py-2.5 text-muted-foreground">{p.due}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard title="Recent Submissions" action={<Button variant="link" size="sm" className="text-primary">View All</Button>}>
          <ul className="space-y-3">
            {recentSubmissions.map((s, i) => (
              <li key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <div className="size-9 rounded-lg bg-info/10 text-info grid place-items-center"><FileCheck className="size-4" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.title} <span className="text-xs text-muted-foreground">· {s.class}</span></div>
                  <div className="text-xs text-muted-foreground">{s.count}</div>
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">{s.time}</span>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
