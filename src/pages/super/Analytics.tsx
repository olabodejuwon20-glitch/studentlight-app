import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Section, MetricCard, Skel, EmptyState, StatusBadge } from "@/components/super/primitives";
import { AreaTrend, BarTrend } from "@/components/super/Chart";
import { compact, money, timeAgo } from "@/lib/super";
import { Building2, Users, ListChecks, Package, DollarSign, Activity } from "lucide-react";

type Bucket = { label: string; value: number };

export default function SuperAnalytics() {
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState({ schools: 0, users: 0, attempts: 0, modules: 0, mrr: 0, exams: 0 });
  const [planMix, setPlanMix] = useState<Bucket[]>([]);
  const [moduleAdoption, setModuleAdoption] = useState<Bucket[]>([]);
  const [examTrend, setExamTrend] = useState<{ label: string; attempts: number }[]>([]);
  const [recent, setRecent] = useState<{ id: string; name: string; created_at: string; plan: string; status: string }[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const since = new Date(); since.setDate(since.getDate() - 29);
      const sinceISO = since.toISOString();

      const [schoolsRes, membershipsRes, attemptsRes, smRes, examsRes, recentRes, modulesRes] = await Promise.all([
        supabase.from("schools").select("id, name, plan, status, created_at"),
        supabase.from("memberships").select("id", { count: "exact", head: true }),
        supabase.from("exam_attempts").select("id, started_at"),
        supabase.from("school_modules").select("module_id, enabled, modules!inner(name)").eq("enabled", true),
        supabase.from("exams").select("id", { count: "exact", head: true }),
        supabase.from("schools").select("id, name, plan, status, created_at").order("created_at", { ascending: false }).limit(8),
        supabase.from("modules").select("id, monthly_price_cents, slug"),
      ]);

      const schools = (schoolsRes.data as any[]) ?? [];
      const attempts = (attemptsRes.data as any[]) ?? [];
      const sm = (smRes.data as any[]) ?? [];
      const modules = (modulesRes.data as any[]) ?? [];

      // KPIs
      const priceById = new Map(modules.map(m => [m.id, m.monthly_price_cents ?? 0]));
      const mrr = sm.reduce((sum, r) => sum + (priceById.get(r.module_id) ?? 0), 0);
      setKpi({
        schools: schools.length,
        users: membershipsRes.count ?? 0,
        attempts: attempts.length,
        modules: sm.length,
        mrr,
        exams: examsRes.count ?? 0,
      });

      // Plan mix
      const planCounts = new Map<string, number>();
      schools.forEach(s => planCounts.set(s.plan, (planCounts.get(s.plan) ?? 0) + 1));
      setPlanMix(Array.from(planCounts.entries()).map(([label, value]) => ({ label, value })));

      // Module adoption — top 10
      const modCounts = new Map<string, number>();
      sm.forEach(r => {
        const name = r.modules?.name ?? "Unknown";
        modCounts.set(name, (modCounts.get(name) ?? 0) + 1);
      });
      setModuleAdoption(
        Array.from(modCounts.entries())
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => b.value - a.value).slice(0, 10),
      );

      // Exam attempts trend — last 30 days
      const days: { label: string; attempts: number }[] = [];
      const dayMap = new Map<string, number>();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10);
        dayMap.set(key, 0);
        days.push({ label: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), attempts: 0 });
      }
      attempts.forEach(a => {
        const key = (a.started_at ?? "").slice(0, 10);
        if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) ?? 0) + 1);
      });
      const keys = Array.from(dayMap.keys());
      keys.forEach((k, i) => { days[i].attempts = dayMap.get(k) ?? 0; });
      setExamTrend(days);

      setRecent((recentRes.data as any[]) ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <PageHeader
        title="Analytics"
        description="Aggregate platform health — adoption, exam volume, revenue and tenant mix."
      />

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {Array.from({ length: 6 }).map((_, i) => <Skel key={i} className="h-28" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <MetricCard label="Schools" value={compact(kpi.schools)} icon={<Building2 className="size-4" />} />
          <MetricCard label="Users" value={compact(kpi.users)} icon={<Users className="size-4" />} />
          <MetricCard label="Exams" value={compact(kpi.exams)} icon={<ListChecks className="size-4" />} />
          <MetricCard label="Attempts (all-time)" value={compact(kpi.attempts)} icon={<Activity className="size-4" />} />
          <MetricCard label="Installed modules" value={compact(kpi.modules)} icon={<Package className="size-4" />} />
          <MetricCard label="MRR (modules)" value={money(kpi.mrr)} icon={<DollarSign className="size-4" />} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Section title="Exam attempts" description="Daily attempt volume over the last 30 days">
          {loading ? <Skel className="h-56" /> : examTrend.length === 0 ? <EmptyState title="No attempts yet" />
            : <AreaTrend data={examTrend} dataKey="attempts" />}
        </Section>
        <Section title="Module adoption" description="Schools with each module enabled">
          {loading ? <Skel className="h-56" /> : moduleAdoption.length === 0 ? <EmptyState title="No modules enabled yet" description="Seed the module registry and enable modules from the Marketplace." />
            : <BarTrend data={moduleAdoption} dataKey="value" color="hsl(var(--success))" />}
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Plan mix" description="Schools by plan">
          {planMix.length === 0 ? <EmptyState title="No schools" /> : (
            <ul className="divide-y divide-border -my-2">
              {planMix.map(p => (
                <li key={p.label} className="py-2.5 flex items-center justify-between text-sm">
                  <span className="capitalize">{p.label}</span>
                  <span className="tabular-nums font-medium">{p.value}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Recently onboarded" description="Newest tenants on the platform" >
          {recent.length === 0 ? <EmptyState title="None yet" /> : (
            <ul className="divide-y divide-border -my-2">
              {recent.map(s => (
                <li key={s.id} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{s.name}</span>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={s.status} />
                    <span className="text-[11px] text-muted-foreground tabular-nums">{timeAgo(s.created_at)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Health summary" description="Quick read on platform state">
          <ul className="text-sm space-y-2">
            <li className="flex justify-between"><span className="text-muted-foreground">Modules per school (avg)</span><span className="tabular-nums font-medium">{kpi.schools ? (kpi.modules / kpi.schools).toFixed(1) : "0"}</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Attempts per exam (avg)</span><span className="tabular-nums font-medium">{kpi.exams ? (kpi.attempts / kpi.exams).toFixed(1) : "0"}</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Users per school (avg)</span><span className="tabular-nums font-medium">{kpi.schools ? (kpi.users / kpi.schools).toFixed(1) : "0"}</span></li>
          </ul>
        </Section>
      </div>
    </div>
  );
}
