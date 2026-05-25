import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Section, Skel, EmptyState } from "@/components/super/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Save, Settings2 } from "lucide-react";
import { MODULE_MANIFESTS } from "@/modules/registry";

type FieldType = "boolean" | "number" | "text" | "textarea" | "select";
type Field = { key: string; label: string; type: FieldType; hint?: string; options?: { value: string; label: string }[]; min?: number; max?: number };
type School = { id: string; name: string; slug: string };
type ModuleRow = { id: string; slug: string; name: string; default_config: Record<string, any>; config_schema: Field[] | null };
type SmRow = { id?: string; school_id: string; module_id: string; enabled: boolean; config: Record<string, any> };

/** Auto-derives a schema from defaultConfig when modules.config_schema is empty. */
function deriveSchema(defaults: Record<string, any>): Field[] {
  return Object.entries(defaults ?? {}).map(([key, val]) => {
    const label = key.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
    if (typeof val === "boolean") return { key, label, type: "boolean" };
    if (typeof val === "number") return { key, label, type: "number" };
    return { key, label, type: "text" };
  });
}

export default function SuperTenantConfig() {
  const [schools, setSchools] = useState<School[] | null>(null);
  const [modules, setModules] = useState<ModuleRow[]>([]);
  const [schoolId, setSchoolId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [sm, setSm] = useState<SmRow | null>(null);
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [s, m] = await Promise.all([
        supabase.from("schools").select("id, name, slug").order("name"),
        supabase.from("modules").select("id, slug, name, default_config, config_schema").order("name"),
      ]);
      setSchools((s.data as School[]) ?? []);
      setModules((m.data as ModuleRow[]) ?? []);
      if (s.data?.length) setSchoolId((s.data[0] as any).id);
      if (m.data?.length) setModuleId((m.data[0] as any).id);
    })();
  }, []);

  const mod = modules.find(m => m.id === moduleId);
  const manifest = useMemo(() => MODULE_MANIFESTS.find(x => x.slug === mod?.slug), [mod?.slug]);

  const schema: Field[] = useMemo(() => {
    if (mod?.config_schema && Array.isArray(mod.config_schema) && mod.config_schema.length) return mod.config_schema as Field[];
    return deriveSchema({ ...(manifest?.defaultConfig ?? {}), ...(mod?.default_config ?? {}) });
  }, [mod, manifest]);

  useEffect(() => {
    if (!schoolId || !moduleId) return;
    (async () => {
      const { data } = await supabase.from("school_modules")
        .select("id, school_id, module_id, enabled, config")
        .eq("school_id", schoolId).eq("module_id", moduleId).maybeSingle();
      const base = { ...(manifest?.defaultConfig ?? {}), ...(mod?.default_config ?? {}) };
      const row = (data as SmRow | null);
      setSm(row);
      setDraft({ ...base, ...(row?.config ?? {}) });
    })();
  }, [schoolId, moduleId, mod, manifest]);

  async function save() {
    if (!schoolId || !moduleId) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("school_modules").upsert(
        { school_id: schoolId, module_id: moduleId, enabled: sm?.enabled ?? true, config: draft as any },
        { onConflict: "school_id,module_id" },
      );
      if (error) throw error;
      toast.success("Tenant config saved");
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally { setSaving(false); }
  }

  function reset() {
    const base = { ...(manifest?.defaultConfig ?? {}), ...(mod?.default_config ?? {}) };
    setDraft(base);
  }

  return (
    <div>
      <PageHeader
        title="Tenant Configuration"
        description="Schema-driven configuration overrides per school and module. Defaults come from the in-repo manifest and the modules registry."
        actions={<Button size="sm" onClick={save} disabled={saving || !schoolId || !moduleId}>
          {saving ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Save className="size-3.5 mr-1.5" />}
          Save overrides
        </Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Section title="Scope">
          <div className="space-y-4">
            <div>
              <Label className="text-xs">School</Label>
              <Select value={schoolId} onValueChange={setSchoolId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select school" /></SelectTrigger>
                <SelectContent>
                  {(schools ?? []).map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Module</Label>
              <Select value={moduleId} onValueChange={setModuleId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select module" /></SelectTrigger>
                <SelectContent>
                  {modules.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg border border-border p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Module enabled</span>
                <Badge variant={sm?.enabled ? "default" : "secondary"} className="text-[10px]">{sm?.enabled ? "yes" : sm ? "no" : "unset"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Override row</span>
                <span className="font-mono">{sm?.id ? "present" : "default only"}</span>
              </div>
              {manifest?.core && <p className="text-[11px] text-muted-foreground">This is a core module — it cannot be disabled, only re-configured.</p>}
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={reset}>Reset to defaults</Button>
          </div>
        </Section>

        <div className="lg:col-span-2">
          <Section
            title={mod?.name ? `${mod.name} configuration` : "Configuration"}
            description="Each field is rendered from the module's config_schema (or auto-derived from default_config)."
          >
            {schools === null ? (
              <div className="space-y-2">{Array.from({length: 4}).map((_, i) => <Skel key={i} className="h-12" />)}</div>
            ) : !mod ? (
              <EmptyState icon={<Settings2 className="size-5 text-muted-foreground" />} title="Pick a module" description="Choose a school and module on the left." />
            ) : schema.length === 0 ? (
              <EmptyState title="No configurable fields" description="This module exposes no overrides." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {schema.map(f => <FieldEditor key={f.key} field={f} value={draft[f.key]} onChange={v => setDraft(d => ({ ...d, [f.key]: v }))} />)}
              </div>
            )}
          </Section>
        </div>
      </div>
    </div>
  );
}

function FieldEditor({ field, value, onChange }: { field: Field; value: any; onChange: (v: any) => void }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <Label className="text-sm">{field.label}</Label>
      {field.hint && <p className="text-[11px] text-muted-foreground mt-0.5">{field.hint}</p>}
      <div className="mt-2">
        {field.type === "boolean" && <Switch checked={!!value} onCheckedChange={onChange} />}
        {field.type === "number" && (
          <Input type="number" min={field.min} max={field.max} value={value ?? 0}
            onChange={e => onChange(Number(e.target.value))} />
        )}
        {field.type === "text" && (
          <Input value={value ?? ""} onChange={e => onChange(e.target.value)} />
        )}
        {field.type === "textarea" && (
          <Textarea value={value ?? ""} onChange={e => onChange(e.target.value)} rows={3} />
        )}
        {field.type === "select" && (
          <Select value={String(value ?? "")} onValueChange={onChange}>
            <SelectTrigger><SelectValue placeholder="Choose…" /></SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground/70 mt-1.5 font-mono">{field.key}</p>
    </div>
  );
}
