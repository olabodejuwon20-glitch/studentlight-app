import { useEffect, useState } from "react";
import { UserSquare2, Star, ClipboardCheck, Wallet, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

export default function ParentDashboard() {
  const { school, user, displayName } = useSchool();
  const [children, setChildren] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<{ present: number; absent: number; late: number }>({ present: 0, absent: 0, late: 0 });
  const [pendingFees, setPendingFees] = useState(0);

  useEffect(() => {
    if (!school || !user) return;
    (async () => {
      const { data: links } = await supabase.from("parent_links").select("student_user_id").eq("school_id", school.id).eq("parent_user_id", user.id);
      const ids = links?.map(l => l.student_user_id) ?? [];
      if (!ids.length) return setChildren([]);
      const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);
      setChildren(profs ?? []);
      setActive(profs?.[0] ?? null);
    })();
  }, [school, user]);

  useEffect(() => {
    if (!active) return;
    (async () => {
      const [{ data: rs }, { data: att }, { data: fees }] = await Promise.all([
        supabase.from("results").select("*").eq("student_id", active.id).order("created_at", { ascending: false }).limit(8),
        supabase.from("attendance").select("status").eq("student_id", active.id),
        supabase.from("fees").select("amount,status").eq("student_id", active.id).neq("status", "paid"),
      ]);
      setResults(rs ?? []);
      const a = att ?? [];
      setAttendance({
        present: a.filter(x => x.status === "present").length,
        absent: a.filter(x => x.status === "absent").length,
        late: a.filter(x => x.status === "late").length,
      });
      setPendingFees((fees ?? []).reduce((s, f) => s + Number(f.amount), 0));
    })();
  }, [active]);

  const total = attendance.present + attendance.absent + attendance.late;
  const attPct = total ? Math.round((attendance.present / total) * 100) : 0;
  const latest = results[0];
  const overall = results.length ? Math.round(results.reduce((s, r) => s + Number(r.score), 0) / results.length) : 0;
  const pieData = [
    { name: "Present", value: attendance.present, color: "hsl(var(--success))" },
    { name: "Absent", value: attendance.absent, color: "hsl(var(--destructive))" },
    { name: "Late", value: attendance.late, color: "hsl(var(--warning))" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl sm:text-2xl font-bold">Good morning, {displayName?.split(" ")[0] || "Parent"}! 👋</h2>
        <p className="text-sm text-muted-foreground">Here's your children's overview.</p>
      </div>

      {children.length === 0 ? (
        <SectionCard title="My Children">
          <EmptyState icon={UserSquare2} title="No children linked" desc="Ask the school admin to link your account to your children." />
        </SectionCard>
      ) : (
        <>
          {children.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {children.map(c => (
                <button key={c.id} onClick={() => setActive(c)}
                  className={`px-3 py-1.5 rounded-full text-sm border whitespace-nowrap transition-colors ${active?.id === c.id ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card hover:bg-muted"}`}>
                  {c.full_name || c.email}
                </button>
              ))}
            </div>
          )}

          {active && (
            <SectionCard title="" className="!p-0">
              <div className="flex items-center gap-4 p-5">
                <Avatar className="size-16">
                  <AvatarFallback className="bg-parent text-white text-lg font-semibold">{(active.full_name || active.email)?.split(" ").map((s: string) => s[0]).join("").slice(0,2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-lg truncate">{active.full_name || active.email}</div>
                  <div className="text-xs text-muted-foreground">Student</div>
                  <Button variant="outline" size="sm" className="mt-2">View Profile</Button>
                </div>
                <div className="hidden sm:grid grid-cols-3 gap-6 text-center">
                  <div><div className="text-xs text-muted-foreground">Overall</div><div className="font-bold text-lg">{overall || "—"}%</div></div>
                  <div><div className="text-xs text-muted-foreground">Attendance</div><div className="font-bold text-lg">{attPct}%</div></div>
                  <div><div className="text-xs text-muted-foreground">Subjects</div><div className="font-bold text-lg">{new Set(results.map(r => r.subject)).size}</div></div>
                </div>
              </div>
            </SectionCard>
          )}

          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard label="Attendance" value={`${attPct}%`} icon={ClipboardCheck} tone="success" sub="This term" />
            <StatCard label="Latest Result" value={latest ? `${Math.round(Number(latest.score))}%` : "—"} icon={Star} tone="warning" sub={latest?.subject ?? "—"} />
            <StatCard label="Pending Fees" value={`₦${pendingFees.toLocaleString()}`} icon={Wallet} tone="parent" sub={pendingFees ? "Outstanding" : "All paid"} />
            <StatCard label="Assignments" value="0" icon={FileText} tone="info" sub="Pending" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SectionCard title="Recent Results">
              {results.length === 0 ? <EmptyState icon={Star} title="No results yet" /> :
                <div className="overflow-x-auto"><table className="w-full text-sm">
                  <thead className="text-xs text-muted-foreground"><tr className="border-b border-border">
                    <th className="text-left py-2">Subject</th><th className="text-right">Score</th><th className="text-left">Grade</th><th className="text-left">Term</th></tr></thead>
                  <tbody>{results.slice(0, 5).map(r => (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="py-3">{r.subject}</td>
                      <td className="text-right tabular-nums font-semibold">{Math.round(Number(r.score))}%</td>
                      <td><span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">{r.grade || "—"}</span></td>
                      <td className="text-muted-foreground">{r.term}</td>
                    </tr>
                  ))}</tbody>
                </table></div>}
            </SectionCard>

            <SectionCard title="Attendance Overview">
              <div className="flex items-center gap-4">
                <div className="relative size-[160px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" innerRadius={56} outerRadius={76} paddingAngle={2}>
                        {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 grid place-items-center pointer-events-none text-center">
                    <div><div className="text-2xl font-bold">{attPct}%</div><div className="text-[10px] text-muted-foreground">Present</div></div>
                  </div>
                </div>
                <ul className="space-y-2 text-sm flex-1">
                  {pieData.map(d => (
                    <li key={d.name} className="flex items-center justify-between">
                      <span className="flex items-center gap-2"><span className="size-2.5 rounded-full" style={{ background: d.color }} />{d.name}</span>
                      <span className="tabular-nums text-muted-foreground">{total ? Math.round((d.value/total)*100) : 0}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            </SectionCard>
          </div>
        </>
      )}
    </div>
  );
}

