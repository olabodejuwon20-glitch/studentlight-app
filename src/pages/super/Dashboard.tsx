import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Users, DollarSign, CreditCard, Package, LifeBuoy, Activity, Clock } from "lucide-react";
import { PageHeader, MetricCard, Section, StatusBadge, Skel, EmptyState } from "@/components/super/primitives";
import { AreaTrend, BarTrend } from "@/components/super/Chart";
import { compact, money, timeAgo } from "@/lib/super";
import { Link } from "react-router-dom";

export default function SuperDashboard() {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    supabase.functions.invoke("super-metrics").then(({ data }) => setData(data));
  }, []);

  if (!data) return (
    <div>
      <PageHeader title="Platform Overview" description="Real-time view of every school, module and dollar on the platform." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{Array.from({length:8}).map((_,i)=><Skel key={i} className="h-28" />)}</div>
    </div>
  );

  const k = data.kpi;
  return (
    <div>
      <PageHeader title="Platform Overview" description="Real-time view of every school, module and dollar on the platform." />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Total Schools" value={compact(k.total_schools)} icon={<Building2 className="size-4" />} delta={{ value: `${k.active_schools} active`, positive: true }} />
        <MetricCard label="Total Users" value={compact(k.total_users)} icon={<Users className="size-4" />} />
        <MetricCard label="Monthly Revenue" value={money(k.mrr_cents)} icon={<DollarSign className="size-4" />} />
        <MetricCard label="Active Subscriptions" value={compact(k.active_subscriptions)} icon={<CreditCard className="size-4" />} />
        <MetricCard label="Installed Modules" value={compact(k.installed_modules)} icon={<Package className="size-4" />} />
        <MetricCard label="Open Tickets" value={compact(k.open_tickets)} icon={<LifeBuoy className="size-4" />} delta={k.critical_tickets ? { value: `${k.critical_tickets} critical`, positive: false } : undefined} />
        <MetricCard label="Platform Uptime" value="99.98%" icon={<Activity className="size-4" />} delta={{ value: "30d", positive: true }} />
        <MetricCard label="Active Sessions" value={compact(Math.round(k.total_users * 0.18))} icon={<Clock className="size-4" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Section title="School growth" description="New schools onboarded per month">
          <AreaTrend data={data.growth} dataKey="schools" />
        </Section>
        <Section title="Revenue trend" description="Estimated monthly recurring revenue">
          <BarTrend data={data.growth} dataKey="revenue" color="hsl(var(--success))" />
        </Section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Section title="Expiring subscriptions" description="Next 30 days">
          {data.expiring.length === 0 ? <EmptyState title="Nothing expiring" description="All subscriptions are healthy." /> : (
            <ul className="divide-y divide-border -my-2">
              {data.expiring.map((s: any) => (
                <li key={s.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                  <Link to={`/super/schools/${s.id}`} className="font-medium truncate hover:underline">{s.name}</Link>
                  <span className={`text-xs tabular-nums ${s.days < 7 ? "text-destructive" : "text-muted-foreground"}`}>{s.days}d</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Recently onboarded">
          {data.recent_schools.length === 0 ? <EmptyState title="No schools yet" /> : (
            <ul className="divide-y divide-border -my-2">
              {data.recent_schools.map((s: any) => (
                <li key={s.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                  <Link to={`/super/schools/${s.id}`} className="font-medium truncate hover:underline">{s.name}</Link>
                  <StatusBadge status={s.status} />
                </li>
              ))}
            </ul>
          )}
        </Section>
        <Section title="Activity feed" description="Latest platform actions">
          {data.recent_audit.length === 0 ? <EmptyState title="No activity yet" /> : (
            <ul className="space-y-2.5 text-xs">
              {data.recent_audit.slice(0, 8).map((a: any) => (
                <li key={a.id} className="flex justify-between gap-2"><span className="font-medium">{a.action.replace(/_/g, " ")}</span><span className="text-muted-foreground">{timeAgo(a.created_at)}</span></li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}