import { Users, GraduationCap, BookOpen, DollarSign, UserPlus, UserCheck, FileText, Wallet, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/StatCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { adminStats, enrollmentTrend, recentActivities, students, performanceByClass, attendanceOverview, topStudents } from "@/data/mock";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ICONS: Record<string, any> = { users: Users, graduationCap: GraduationCap, bookOpen: BookOpen, dollarSign: DollarSign, userPlus: UserPlus, userCheck: UserCheck, fileText: FileText, wallet: Wallet };

const ACT_TONE: Record<string, { bg: string; fg: string }> = {
  info:    { bg: "bg-info/10",       fg: "text-info" },
  success: { bg: "bg-success/10",    fg: "text-success" },
  warning: { bg: "bg-warning/10",    fg: "text-warning" },
  student: { bg: "bg-student/10",    fg: "text-student" },
  parent:  { bg: "bg-parent/10",     fg: "text-parent" },
};

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div />
        <Select defaultValue="2024-2025">
          <SelectTrigger className="w-[200px] bg-card"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="2024-2025">This Term (2024/2025)</SelectItem>
            <SelectItem value="2023-2024">Last Term (2023/2024)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {adminStats.map((s) => (
          <StatCard key={s.label} {...s} icon={ICONS[s.icon]} tone={s.color as any} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <SectionCard title="Student Enrollment Trend" className="lg:col-span-2"
          action={
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-primary" />This Term</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-muted-foreground/40" />Last Term</span>
            </div>
          }>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={enrollmentTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                <Line type="monotone" dataKey="thisTerm" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="lastTerm" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Recent Activities" action={<Button variant="link" size="sm" className="text-primary">View All</Button>}>
          <ul className="space-y-4">
            {recentActivities.map((a, i) => {
              const Icon = ICONS[a.icon] ?? FileText;
              return (
              <li key={i} className="flex gap-3">
                  <div className={`size-9 rounded-lg grid place-items-center shrink-0 ${ACT_TONE[a.color]?.bg ?? "bg-secondary"}`}>
                    <Icon className={`size-4 ${ACT_TONE[a.color]?.fg ?? "text-foreground"}`} />
                  </div>
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

      <SectionCard title="Recent Students" action={<Button variant="link" size="sm" className="text-primary">View All</Button>}>
        <div className="overflow-x-auto -mx-5 px-5">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
                <th className="text-left font-medium py-3 pr-4">ID</th>
                <th className="text-left font-medium py-3 pr-4">Name</th>
                <th className="text-left font-medium py-3 pr-4">Class</th>
                <th className="text-left font-medium py-3 pr-4">Admission No.</th>
                <th className="text-left font-medium py-3 pr-4">Status</th>
                <th className="text-left font-medium py-3 pr-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {students.slice(0, 5).map((s) => (
                <tr key={s.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                  <td className="py-3 pr-4">{s.id}</td>
                  <td className="py-3 pr-4 font-medium">{s.name}</td>
                  <td className="py-3 pr-4">{s.class}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{s.admission}</td>
                  <td className="py-3 pr-4">
                    <Badge variant="outline" className={s.status === "Active" ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive"}>
                      {s.status}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="size-8 text-info"><Eye className="size-4" /></Button>
                      <Button variant="ghost" size="icon" className="size-8 text-warning"><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" className="size-8 text-destructive"><Trash2 className="size-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Reports Overview" action={<Button variant="link" size="sm" className="text-primary">View All Reports</Button>}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <div className="text-xs text-muted-foreground mb-2">Performance by Class</div>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceByClass} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="class" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="score" fill="hsl(var(--primary))" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-2">Attendance Overview</div>
            <div className="h-[200px] relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={attendanceOverview} dataKey="value" innerRadius={55} outerRadius={80} paddingAngle={2}>
                    {attendanceOverview.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center pointer-events-none mt-[-30px]">
                <div className="text-center">
                  <div className="text-2xl font-display font-bold">92%</div>
                  <div className="text-[10px] text-muted-foreground">Avg Attendance</div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-2">Top Performing Students</div>
            <ul className="divide-y divide-border">
              {topStudents.map((s) => (
                <li key={s.rank} className="py-2.5 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-muted-foreground w-4 text-xs">{s.rank}.</span>
                    <span className="font-medium truncate">{s.name}</span>
                    <span className="text-xs text-muted-foreground">{s.class}</span>
                  </div>
                  <span className="font-semibold text-success">{s.score}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
