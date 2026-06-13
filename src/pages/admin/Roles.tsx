import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save, ShieldCheck } from "lucide-react";
import { PERMISSION_GROUPS, ALL_PERMISSION_KEYS } from "@/lib/adminPermissions";

type SlotRow = {
  slot: number;
  name: string;
  enabled: boolean;
  permissions: string[];
};

const EMPTY_SLOTS: SlotRow[] = [1, 2, 3].map((slot) => ({ slot, name: "", enabled: false, permissions: [] }));

export default function AdminRoles() {
  const { school } = useSchool();
  const [slots, setSlots] = useState<SlotRow[]>(EMPTY_SLOTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  async function load() {
    if (!school) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_role_slots")
      .select("slot,name,enabled,permissions")
      .eq("school_id", school.id)
      .order("slot");
    if (error) toast.error(error.message);
    const map = new Map<number, SlotRow>();
    (data ?? []).forEach((row: any) => {
      map.set(row.slot, {
        slot: row.slot,
        name: row.name ?? "",
        enabled: !!row.enabled,
        permissions: Array.isArray(row.permissions) ? row.permissions : [],
      });
    });
    setSlots([1, 2, 3].map((slot) => map.get(slot) ?? { slot, name: "", enabled: false, permissions: [] }));
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [school?.id]);

  function update(slot: number, patch: Partial<SlotRow>) {
    setSlots((s) => s.map((r) => (r.slot === slot ? { ...r, ...patch } : r)));
  }

  function toggleKey(slot: number, key: string, on: boolean) {
    setSlots((s) =>
      s.map((r) => {
        if (r.slot !== slot) return r;
        const set = new Set(r.permissions);
        if (on) set.add(key); else set.delete(key);
        return { ...r, permissions: Array.from(set) };
      }),
    );
  }

  function toggleAll(slot: number, on: boolean) {
    update(slot, { permissions: on ? ALL_PERMISSION_KEYS.slice() : [] });
  }

  async function save(slot: number) {
    if (!school) return;
    const row = slots.find((r) => r.slot === slot)!;
    const cleaned = row.name.trim();
    if (row.enabled && !cleaned) {
      toast.error("Give this role a name before enabling it.");
      return;
    }
    setSaving(slot);
    const { error } = await supabase.from("admin_role_slots")
      .upsert(
        { school_id: school.id, slot, name: cleaned, enabled: row.enabled, permissions: row.permissions },
        { onConflict: "school_id,slot" },
      );
    setSaving(null);
    if (error) return toast.error(error.message);
    toast.success(`Role ${slot} saved`);
    load();
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Custom admin roles"
        description="Create up to 3 sub-admin roles. Name each role and pick exactly what they can access. Generate an invite from the Invites page to assign someone."
      />
      {loading ? (
        <div className="grid place-items-center py-12 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {slots.map((row) => {
            const allOn = row.permissions.length === ALL_PERMISSION_KEYS.length;
            return (
              <SectionCard
                key={row.slot}
                title={
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center size-6 rounded-md bg-primary/10 text-primary text-xs font-semibold">{row.slot}</span>
                    <span>Role slot {row.slot}</span>
                    {row.enabled ? <Badge variant="secondary" className="text-[10px]"><ShieldCheck className="size-3 mr-1" />Active</Badge> : <Badge variant="outline" className="text-[10px]">Disabled</Badge>}
                  </div>
                }
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Role name</Label>
                    <Input
                      placeholder="e.g. Bursar, Vice Principal, Exam Officer"
                      value={row.name}
                      maxLength={40}
                      onChange={(e) => update(row.slot, { name: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                    <div>
                      <div className="text-sm font-medium">Enabled</div>
                      <div className="text-[11px] text-muted-foreground">Off = invites for this slot are blocked.</div>
                    </div>
                    <Switch checked={row.enabled} onCheckedChange={(v) => update(row.slot, { enabled: !!v })} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Permissions</div>
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={() => toggleAll(row.slot, !allOn)}
                    >
                      {allOn ? "Clear all" : "Grant all"}
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {PERMISSION_GROUPS.map((g) => (
                      <div key={g.label} className="rounded-md border border-border/60 p-2.5">
                        <div className="text-[11px] font-semibold uppercase text-muted-foreground mb-1.5">{g.label}</div>
                        <div className="space-y-1.5">
                          {g.items.map((it) => {
                            const on = row.permissions.includes(it.key);
                            return (
                              <label key={it.key} className="flex items-start gap-2 text-sm cursor-pointer">
                                <Checkbox
                                  className="mt-0.5"
                                  checked={on}
                                  onCheckedChange={(v) => toggleKey(row.slot, it.key, !!v)}
                                />
                                <span className="leading-tight">{it.label}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button className="w-full" disabled={saving === row.slot} onClick={() => save(row.slot)}>
                    {saving === row.slot ? <Loader2 className="size-4 animate-spin mr-1.5" /> : <Save className="size-4 mr-1.5" />}
                    Save role {row.slot}
                  </Button>
                </div>
              </SectionCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
