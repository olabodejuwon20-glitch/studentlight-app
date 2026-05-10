import { useEffect, useState } from "react";
import { ListChecks, ClipboardCheck, Star, FileText, Megaphone, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { StatCard } from "@/components/dashboard/StatCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function StudentDashboard() {
  const { school, user, displayName } = useSchool();
  const [exams, setExams] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [attPct, setAttPct] = useState(0);
  const [announcements, setAnnouncements] = useState<any[]>([]);

  useEffect(() => {
    if (!school || !user) return;
    (async () => {
      const [{ data: ex }, { data: rs }, { data: att }, { data: ann }] = await Promise.all([
        supabase.from("exams").select("id,title,subject,scheduled_at,status").eq("school_id", school.id).in("status", ["scheduled","active"]).order("scheduled_at", { ascending: true }).limit(5),
        supabase.from("results").select("subject,score,created_at").eq("student_id", user.id).order("created_at", { ascending: true }),
        supabase.from("attendance").select("status").eq("student_id", user.id),
        supabase.from("announcements").select("title,body,created_at").eq("school_id", school.id).order("created_at", { ascending: false }).limit(3),
      ]);
      setExams(ex ?? []); setResults(rs ?? []); setAnnouncements(ann ?? []);
      const t = att?.length ?? 0;
      setAttPct(t ? Math.round(((att!.filter(a => a.status === "present").length) / t) * 100) : 0);
    })();
  }, [school, user]);

  const latest = results.length ? Math.round(Number(results[results.length - 1].score)) : 0;
  const chart = results.slice(-8).map(r => ({ subject: r.subject, score: Number(r.score) }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold">Welcome back, {displayName?.split(" ")[0] || "Student"}! 👋</h2>
          <p className="text-sm text-muted-foreground">Here's what's happening today.</p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-card"><Calendar className="size-3.5 text-muted-foreground" />{new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Upcoming Exams" value={String(exams.length)} icon={ListChecks} tone="student" sub={exams[0] ? `Next: ${exams[0].title}` : "No upcoming"} />
        <StatCard label="Attendance" value={`${attPct}%`} icon={ClipboardCheck} tone="success" sub="This term" />
        <StatCard label="Recent Score" value={latest ? `${latest}%` : "—"} icon={Star} tone="warning" sub={results[results.length - 1]?.subject ?? "—"} />
        <StatCard label="Assigned Tasks" value="0" icon={FileText} tone="info" sub="Pending" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard title="Upcoming Exams">
          {exams.length === 0 ? <EmptyState icon={ListChecks} title="No upcoming exams" /> :
            <ul className="space-y-2">{exams.map(e => {
              const days = e.scheduled_at ? Math.max(0, Math.round((new Date(e.scheduled_at).getTime() - Date.now()) / 86400000)) : null;
              return (
                <li key={e.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3"><div className="size-9 rounded-lg bg-student/10 grid place-items-center"><FileText className="size-4 text-student" /></div>
                    <div><div className="font-medium">{e.title}</div><div className="text-xs text-muted-foreground">{e.scheduled_at ? new Date(e.scheduled_at).toLocaleDateString() : "TBD"}</div></div>
                  </div>
                  {days !== null && <span className="text-xs text-warning font-medium">{days} days left</span>}
                </li>
              );
            })}</ul>}
        </SectionCard>

        <SectionCard title="Performance Overview">
          {chart.length === 0 ? <EmptyState icon={Star} title="No results yet" /> :
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="subject" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis domain={[0, 100]} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="score" stroke="hsl(var(--student))" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>}
        </SectionCard>
      </div>

      <SectionCard title="Announcements">
        {announcements.length === 0
          ? <EmptyState icon={Megaphone} title="No announcements" />
          : <div className="grid sm:grid-cols-3 gap-3">{announcements.map((a, i) => (
              <div key={i} className="p-4 rounded-lg border border-border bg-muted/30">
                <div className="font-semibold text-sm">{a.title}</div>
                {a.body && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{a.body}</div>}
                <div className="text-[11px] text-muted-foreground mt-2">{new Date(a.created_at).toLocaleDateString()}</div>
              </div>
            ))}</div>}
      </SectionCard>
    </div>
  );
}

