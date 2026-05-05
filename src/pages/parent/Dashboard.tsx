import { ClipboardCheck, Star, Wallet, FileText, FileCheck, Upload, UserX, Award } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/StatCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from "recharts";
import { childOverview, studentResults, attendanceOverview, activityFeed } from "@/data/mock";

const ICONS: Record<string, any> = { fileCheck: FileCheck, upload: Upload, userX: UserX, award: Award };

export default function ParentDashboard() {
  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-card border border-border p-5 shadow-card">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <Avatar className="size-20"><AvatarFallback className="bg-parent/15 text-parent text-xl font-bold">JD</AvatarFallback></Avatar>
          <div className="flex-1">
            <div className="font-display font-bold text-xl">{childOverview.name}</div>
            <div className="text-sm text-muted-foreground">{childOverview.class}</div>
            <Button size="sm" variant="secondary" className="mt-3">View Profile</Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            <Stat label="Overall Performance" value={`${childOverview.performance}%`} />
            <Stat label="Attendance"          value={`${childOverview.attendance}%`} />
            <Stat label="Last Result"         value={childOverview.lastResult} />
            <Stat label="Total Subjects"      value={`${childOverview.subjects}`} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Attendance"   value="92%"      sub="This Term"        icon={ClipboardCheck} tone="success" />
        <StatCard label="Latest Result"value="85%"      sub="In Mathematics"   icon={Star}           tone="warning" />
        <StatCard label="Pending Fees" value="₦25,000"  sub="View Details"     icon={Wallet}         tone="parent" />
        <StatCard label="Assignments"  value="3"        sub="Pending"          icon={FileText}       tone="info" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard title="Recent Results" action={<Button variant="link" size="sm" className="text-primary">View All Results</Button>}>
          <table className="w-full text-sm">
            <thead><tr className="text-xs uppercase text-muted-foreground border-b border-border">
              <th className="text-left font-medium py-2">Subject</th><th className="text-left font-medium py-2">Score</th>
              <th className="text-left font-medium py-2">Grade</th><th className="text-left font-medium py-2">Term</th>
            </tr></thead>
            <tbody>
              {studentResults.slice(0, 5).map((r) => (
                <tr key={r.subject} className="border-b border-border last:border-0">
                  <td className="py-2.5 font-medium">{r.subject}</td>
                  <td className="py-2.5">{r.score}%</td>
                  <td className="py-2.5"><Badge variant="outline" className="border-success/30 bg-success/10 text-success">{r.grade}</Badge></td>
                  <td className="py-2.5 text-muted-foreground">Third Term</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>

        <SectionCard title="Attendance Overview">
          <div className="h-[260px] relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={attendanceOverview} dataKey="value" innerRadius={60} outerRadius={95} paddingAngle={2}>
                  {attendanceOverview.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 grid place-items-center pointer-events-none mt-[-30px]">
              <div className="text-center"><div className="text-2xl font-display font-bold">92%</div><div className="text-[10px] text-muted-foreground">Present</div></div>
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Activity Feed" action={<Button variant="link" size="sm" className="text-primary">View All Activities</Button>}>
        <ul className="space-y-3">
          {activityFeed.map((a, i) => {
            const Icon = ICONS[a.icon] ?? FileText;
            return (
              <li key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <div className="size-10 rounded-lg bg-parent/10 text-parent grid place-items-center shrink-0"><Icon className="size-5" /></div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{a.title}</div>
                  <div className="text-xs text-muted-foreground">{a.desc}</div>
                </div>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">{a.time}</span>
              </li>
            );
          })}
        </ul>
      </SectionCard>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-xl font-display font-bold mt-0.5">{value}</div>
    </div>
  );
}
