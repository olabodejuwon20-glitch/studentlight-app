import { ListChecks, ClipboardCheck, Star, FileText, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/StatCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { upcomingExams, performanceTrend, announcements } from "@/data/mock";

export default function StudentDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Upcoming Exams" value="3"   sub="View all"          icon={ListChecks}     tone="student" />
        <StatCard label="Attendance"     value="92%" sub="View details"      icon={ClipboardCheck} tone="success" />
        <StatCard label="Recent Score"   value="85%" sub="In Mathematics"    icon={Star}           tone="warning" />
        <StatCard label="Assigned Tasks" value="4"   sub="View all"          icon={FileText}       tone="info" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Upcoming Exams" action={<Button variant="link" size="sm" className="text-primary">View All Exams</Button>}>
          <ul className="space-y-3">
            {upcomingExams.map((e, i) => (
              <li key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <div className="size-10 rounded-lg bg-student/10 text-student grid place-items-center"><Calendar className="size-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{e.subject}</div>
                  <div className="text-xs text-muted-foreground">{e.date}</div>
                </div>
                <span className="text-xs text-warning font-semibold">{e.left}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Performance Overview">
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceTrend} margin={{ top: 10, right: 10, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="subject" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="score" stroke="hsl(var(--student))" strokeWidth={3} dot={{ r: 4, fill: "hsl(var(--student))" }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Announcements" action={<Button variant="link" size="sm" className="text-primary">View All</Button>}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {announcements.map((a, i) => (
            <div key={i} className="rounded-lg border border-border p-4">
              <div className="font-semibold">{a.title}</div>
              <div className="text-xs text-muted-foreground mt-1">{a.desc}</div>
              <div className="text-[11px] text-muted-foreground mt-3">{a.time}</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
