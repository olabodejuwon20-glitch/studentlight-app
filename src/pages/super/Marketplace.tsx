import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Section, StatusBadge, Skel, EmptyState } from "@/components/super/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, ShoppingBag, Inbox } from "lucide-react";

type School = { id: string; name: string; slug: string; plan: string };
type Module = { id: string; slug: string; name: string; category: string; pricing_model: string; monthly_price_cents: number; term_price_kobo: number };
type SchoolModule = { id: string; school_id: string; module_id: string; enabled: boolean };
type Request = { id: string; school_id: string; title: string; description: string | null; status: string; created_at: string; module_id: string | null };

export default function SuperMarketplace() {
  const [schools, setSchools] = useState<School[] | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [schoolId, setSchoolId] = useState<string>("");
  const [matrix, setMatrix] = useState<SchoolModule[]>([]);
  const [requests, setRequests] = useState<Request[] | null>(null);
  const [filter, setFilter] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [s, m, r] = await Promise.all([
        supabase.from("schools").select("id, name, slug, plan").order("name"),
        supabase.from("modules").select("id, slug, name, category, pricing_model, monthly_price_cents, term_price_kobo").order("name"),
        supabase.from("module_requests").select("*").order("created_at", { ascending: false }),
      ]);
      setSchools((s.data as School[]) ?? []);
      setModules((m.data as Module[]) ?? []);
      setRequests((r.data as Request[]) ?? []);
      if (s.data && s.data.length) setSchoolId((s.data[0] as any).id);
    })();
  }, []);

  useEffect(() => {
    if (!schoolId) return;
    supabase.from("school_modules").select("id, school_id, module_id, enabled").eq("school_id", schoolId)
      .then(({ data }) => setMatrix((data as SchoolModule[]) ?? []));
  }, [schoolId]);

  async function toggleModule(mod: Module, on: boolean) {
    if (!schoolId) return;
    setBusyId(mod.id);
    try {
      const existing = matrix.find(x => x.module_id === mod.id);
      if (existing) {
        const { error } = await supabase.from("school_modules").update({ enabled: on }).eq("id", existing.id);
        if (error) throw error;
        setMatrix(m => m.map(x => x.id === existing.id ? { ...x, enabled: on } : x));
      } else {
        const { data, error } = await supabase.from("school_modules")
          .insert({ school_id: schoolId, module_id: mod.id, enabled: on, config: {} as any })
          .select("id, school_id, module_id, enabled").single();
        if (error) throw error;
        setMatrix(m => [...m, data as SchoolModule]);
      }
      toast.success(`${mod.name} ${on ? "enabled" : "disabled"}`);
    } catch (e: any) {
      toast.error(e.message ?? "Update failed");
    } finally { setBusyId(null); }
  }

  async function setRequestStatus(req: Request, status: "approved" | "rejected") {
    const { error } = await supabase.from("module_requests").update({ status }).eq("id", req.id);
    if (error) return toast.error(error.message);
    setRequests(rs => rs?.map(x => x.id === req.id ? { ...x, status } : x) ?? null);
    toast.success(`Request ${status}`);
  }

  const filtered = modules.filter(m => !filter || m.name.toLowerCase().includes(filter.toLowerCase()) || m.slug.includes(filter.toLowerCase()));

  return (
    <div>
      <PageHeader
        title="Marketplace"
        description="Enable, disable and price modules for each tenant. Approve incoming module requests from schools."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Section
            title="Module catalog per school"
            description="Toggle individual plug-ins on or off for the selected tenant."
          >
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="min-w-[240px] flex-1">
                <Select value={schoolId} onValueChange={setSchoolId}>
                  <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                  <SelectContent>
                    {(schools ?? []).map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name} <span className="text-muted-foreground">· {s.plan}</span></SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input className="max-w-xs" placeholder="Filter modules…" value={filter} onChange={e => setFilter(e.target.value)} />
            </div>

            {schools === null ? (
              <div className="space-y-2">{Array.from({length:4}).map((_,i)=><Skel key={i} className="h-14" />)}</div>
            ) : modules.length === 0 ? (
              <EmptyState icon={<ShoppingBag className="size-5 text-muted-foreground" />} title="No modules registered"
                description="Seed the registry from Modules & Plugins first." />
            ) : (
              <ul className="divide-y divide-border -my-2">
                {filtered.map(m => {
                  const row = matrix.find(x => x.module_id === m.id);
                  const on = !!row?.enabled;
                  return (
                    <li key={m.id} className="py-3 flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{m.name}</span>
                          <Badge variant="secondary" className="text-[10px] capitalize">{m.category}</Badge>
                          {m.pricing_model !== "included" && (
                            <Badge className="text-[10px] capitalize">{m.pricing_model}</Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {m.term_price_kobo ? `₦${Math.round(m.term_price_kobo/100).toLocaleString("en-NG")}/term` : "Included"}
                        </p>
                      </div>
                      {busyId === m.id ? <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        : <Switch checked={on} onCheckedChange={v => toggleModule(m, v)} disabled={!schoolId} />}
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Incoming requests" description="Schools asking for new or premium modules.">
            {requests === null ? (
              <div className="space-y-2">{Array.from({length:3}).map((_,i)=><Skel key={i} className="h-16" />)}</div>
            ) : requests.length === 0 ? (
              <EmptyState icon={<Inbox className="size-5 text-muted-foreground" />} title="No pending requests"
                description="When schools request modules they'll show up here." />
            ) : (
              <ul className="divide-y divide-border -my-2">
                {requests.map(r => {
                  const school = (schools ?? []).find(s => s.id === r.school_id);
                  return (
                    <li key={r.id} className="py-3 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{r.title}</p>
                          <p className="text-[11px] text-muted-foreground">{school?.name ?? "—"}</p>
                        </div>
                        <StatusBadge status={r.status} />
                      </div>
                      {r.description && <p className="text-xs text-muted-foreground line-clamp-2">{r.description}</p>}
                      {r.status === "pending" && (
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" variant="outline" onClick={() => setRequestStatus(r, "rejected")}>Reject</Button>
                          <Button size="sm" onClick={() => setRequestStatus(r, "approved")}>Approve</Button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}
