import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Section, MetricCard, Skel, StatusBadge, EmptyState } from "@/components/super/primitives";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CreditCard, Search, AlertTriangle, TrendingUp, DollarSign, Calendar } from "lucide-react";

type Plan = "trial" | "basic" | "standard" | "premium" | "enterprise";
type School = {
  id: string; name: string; slug: string; status: string;
  plan: Plan; plan_started_at: string; plan_expires_at: string | null;
};
type Mod = { id: string; monthly_price_cents: number };
type SM = { school_id: string; module_id: string; enabled: boolean };

const PLAN_BASE: Record<Plan, number> = { trial: 0, basic: 2900, standard: 9900, premium: 19900, enterprise: 49900 };

export default function SuperSubscriptions() {
  const [schools, setSchools] = useState<School[] | null>(null);
  const [modules, setModules] = useState<Mod[]>([]);
  const [matrix, setMatrix] = useState<SM[]>([]);
  const [q, setQ] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [editing, setEditing] = useState<School | null>(null);
  const [newPlan, setNewPlan] = useState<Plan>("basic");
  const [newExpiry, setNewExpiry] = useState<string>("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const [s, m, sm] = await Promise.all([
      supabase.from("schools").select("id, name, slug, status, plan, plan_started_at, plan_expires_at").order("name"),
      supabase.from("modules").select("id, monthly_price_cents"),
      supabase.from("school_modules").select("school_id, module_id, enabled").eq("enabled", true),
    ]);
    setSchools((s.data as School[]) ?? []);
    setModules((m.data as Mod[]) ?? []);
    setMatrix((sm.data as SM[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  const mrrFor = (schoolId: string, plan: Plan) => {
    const addOns = matrix.filter(x => x.school_id === schoolId)
      .reduce((acc, x) => acc + (modules.find(m => m.id === x.module_id)?.monthly_price_cents ?? 0), 0);
    return PLAN_BASE[plan] + addOns;
  };

  const totals = useMemo(() => {
    const list = schools ?? [];
    const active = list.filter(s => s.status === "active" && s.plan !== "trial");
    const mrr = active.reduce((acc, s) => acc + mrrFor(s.id, s.plan), 0);
    const trials = list.filter(s => s.plan === "trial").length;
    const expiringSoon = list.filter(s => s.plan_expires_at && new Date(s.plan_expires_at).getTime() - Date.now() < 14 * 86400_000 && new Date(s.plan_expires_at).getTime() > Date.now()).length;
    const overdue = list.filter(s => s.plan_expires_at && new Date(s.plan_expires_at).getTime() < Date.now()).length;
    return { mrr, active: active.length, trials, expiringSoon, overdue };
  }, [schools, matrix, modules]);

  const filtered = useMemo(() => (schools ?? [])
    .filter(s => (planFilter === "all" || s.plan === planFilter))
    .filter(s => !q.trim() || s.name.toLowerCase().includes(q.toLowerCase()) || s.slug.toLowerCase().includes(q.toLowerCase()))
  , [schools, planFilter, q]);

  function openEdit(s: School) {
    setEditing(s);
    setNewPlan(s.plan);
    setNewExpiry(s.plan_expires_at ? s.plan_expires_at.slice(0, 10) : "");
  }

  async function savePlan() {
    if (!editing) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("schools")
        .update({ plan: newPlan, plan_expires_at: newExpiry ? new Date(newExpiry).toISOString() : null })
        .eq("id", editing.id);
      if (error) throw error;
      toast.success("Subscription updated");
      setEditing(null);
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update");
    } finally { setSaving(false); }
  }

  const fmt = (cents: number) => `$${(cents/100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  return (
    <div className="max-w-7xl mx-auto">
      <PageHeader title="Subscriptions" description="Active subscriptions, plan changes, renewal pipeline, and MRR per tenant." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard label="MRR" value={schools ? fmt(totals.mrr) : <Skel className="h-6 w-24" />} icon={<DollarSign className="size-4" />} />
        <MetricCard label="Paid tenants" value={schools ? totals.active : <Skel className="h-6 w-12" />} icon={<TrendingUp className="size-4" />} />
        <MetricCard label="On trial" value={schools ? totals.trials : <Skel className="h-6 w-12" />} icon={<Calendar className="size-4" />} />
        <MetricCard label="Renewals < 14d" value={schools ? totals.expiringSoon : <Skel className="h-6 w-12" />} delta={totals.overdue ? { value: `${totals.overdue} overdue`, positive: false } : undefined} icon={<AlertTriangle className="size-4" />} />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} className="pl-9" />
        </div>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All plans</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="basic">Basic</SelectItem>
            <SelectItem value="standard">Standard</SelectItem>
            <SelectItem value="premium">Premium</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Section title="Subscription pipeline">
        {schools === null ? (
          <div className="space-y-2"><Skel className="h-10" /><Skel className="h-10" /><Skel className="h-10" /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={<CreditCard className="size-5" />} title="No subscriptions" />
        ) : (
          <div className="overflow-x-auto -mx-5">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-2 font-medium">School</th>
                  <th className="text-left px-3 py-2 font-medium">Plan</th>
                  <th className="text-left px-3 py-2 font-medium">Status</th>
                  <th className="text-right px-3 py-2 font-medium">MRR</th>
                  <th className="text-left px-3 py-2 font-medium">Started</th>
                  <th className="text-left px-3 py-2 font-medium">Renews</th>
                  <th className="px-5 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const exp = s.plan_expires_at ? new Date(s.plan_expires_at) : null;
                  const daysLeft = exp ? Math.ceil((exp.getTime() - Date.now()) / 86400_000) : null;
                  const expColor = daysLeft === null ? "text-muted-foreground"
                    : daysLeft < 0 ? "text-destructive"
                    : daysLeft < 14 ? "text-warning" : "text-foreground";
                  return (
                    <tr key={s.id} className="border-b border-border/60 hover:bg-muted/30">
                      <td className="px-5 py-3"><div className="font-medium">{s.name}</div><div className="text-xs text-muted-foreground">{s.slug}</div></td>
                      <td className="px-3 py-3 capitalize text-foreground">{s.plan}</td>
                      <td className="px-3 py-3"><StatusBadge status={s.status} /></td>
                      <td className="px-3 py-3 text-right tabular-nums">{fmt(mrrFor(s.id, s.plan))}</td>
                      <td className="px-3 py-3 text-muted-foreground">{new Date(s.plan_started_at).toLocaleDateString()}</td>
                      <td className={`px-3 py-3 ${expColor}`}>
                        {exp ? (
                          <>
                            {exp.toLocaleDateString()}
                            <div className="text-[11px]">
                              {daysLeft === null ? "" : daysLeft < 0 ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}
                            </div>
                          </>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => openEdit(s)}>Manage</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage subscription</DialogTitle>
            <DialogDescription>{editing?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Plan</Label>
              <Select value={newPlan} onValueChange={(v) => setNewPlan(v as Plan)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial — Free</SelectItem>
                  <SelectItem value="basic">Basic — $29/mo</SelectItem>
                  <SelectItem value="standard">Standard — $99/mo</SelectItem>
                  <SelectItem value="premium">Premium — $199/mo</SelectItem>
                  <SelectItem value="enterprise">Enterprise — $499/mo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Renewal date</Label>
              <Input type="date" value={newExpiry} onChange={e => setNewExpiry(e.target.value)} />
              <p className="text-xs text-muted-foreground mt-1">Leave blank for no expiry (manual/enterprise contracts).</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={savePlan} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}