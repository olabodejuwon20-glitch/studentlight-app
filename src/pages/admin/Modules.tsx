import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSchool } from "@/contexts/SchoolContext";
import { useEnabledModules } from "@/modules/useModules";
import { MODULE_MANIFESTS } from "@/modules/registry";
import { supabase } from "@/integrations/supabase/client";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Package, Settings2 } from "lucide-react";

type CbtConfig = {
  webcamProctoring: boolean;
  aiProctoring: boolean;
  negativeMarking: boolean;
  randomizeQuestions: boolean;
  violationLimit: number;
  showAnswersAfterEach: boolean;
  autoSubmitOnTimeout: boolean;
};

export default function AdminModules() {
  const { school } = useSchool();
  const qc = useQueryClient();
  const { data: enabled, isLoading } = useEnabledModules(school?.id);
  const cbtManifest = MODULE_MANIFESTS.find(m => m.slug === "cbt")!;
  const cbtEnabled = enabled?.find(m => m.slug === "cbt");
  const defaults = cbtManifest.defaultConfig as CbtConfig;
  const current = (cbtEnabled?.config ?? {}) as Partial<CbtConfig>;
  const [cfg, setCfg] = useState<CbtConfig>({ ...defaults, ...current });
  const [saving, setSaving] = useState(false);

  // sync when query resolves
  useMemo(() => {
    if (cbtEnabled) setCfg({ ...defaults, ...(cbtEnabled.config as Partial<CbtConfig>) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cbtEnabled?.config]);

  async function saveCbt() {
    if (!school) return;
    setSaving(true);
    try {
      const { data: modRow, error: e1 } = await supabase.from("modules").select("id").eq("slug", "cbt").maybeSingle();
      if (e1) throw e1;
      if (!modRow) throw new Error("CBT module is not registered yet. Ask a super admin to seed the module registry.");
      const { error } = await supabase
        .from("school_modules")
        .upsert(
          { school_id: school.id, module_id: modRow.id, config: cfg as any, enabled: true },
          { onConflict: "school_id,module_id" },
        );
      if (error) throw error;
      toast.success("CBT settings saved");
      qc.invalidateQueries({ queryKey: ["enabled-modules", school.id] });
    } catch (e: any) {
      toast.error(e.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Modules"
        description="Configure which plug-in modules and what behavior is active for your school."
      />

      <SectionCard title="Enabled modules">
        {isLoading ? (
          <div className="py-6 grid place-items-center text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(enabled ?? []).map(m => {
              const Icon = m.icon;
              return (
                <div key={m.slug} className="rounded-lg border border-border bg-card p-4 flex items-start gap-3">
                  <div className="size-9 rounded-md bg-muted grid place-items-center text-foreground/80">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{m.name}</p>
                      {m.core && <Badge variant="secondary" className="text-[10px]">Core</Badge>}
                    </div>
                    <p className="text-[11px] text-muted-foreground capitalize mt-0.5">{m.category}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[11px] text-muted-foreground mt-3">
          To enable additional premium modules, request them from the marketplace or contact your account manager.
        </p>
      </SectionCard>

      <SectionCard title="CBT Simulation settings" description="Defaults applied to every CBT/NECO exam in your school. Individual exams can still override these.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <ToggleRow label="Webcam proctoring" hint="Capture periodic snapshots of the student during exams."
            checked={cfg.webcamProctoring} onChange={v => setCfg({ ...cfg, webcamProctoring: v })} />
          <ToggleRow label="AI proctoring assist" hint="Flag suspicious behavior on snapshots using AI."
            checked={cfg.aiProctoring} onChange={v => setCfg({ ...cfg, aiProctoring: v })} />
          <ToggleRow label="Randomize questions" hint="Shuffle question order per student."
            checked={cfg.randomizeQuestions} onChange={v => setCfg({ ...cfg, randomizeQuestions: v })} />
          <ToggleRow label="Negative marking" hint="Deduct points for wrong answers."
            checked={cfg.negativeMarking} onChange={v => setCfg({ ...cfg, negativeMarking: v })} />
          <ToggleRow label="Auto-submit on timeout" hint="Submit attempt automatically when the timer hits zero."
            checked={cfg.autoSubmitOnTimeout} onChange={v => setCfg({ ...cfg, autoSubmitOnTimeout: v })} />
          <ToggleRow label="Show answers after each Q" hint="Practice mode: reveal correct answer immediately."
            checked={cfg.showAnswersAfterEach} onChange={v => setCfg({ ...cfg, showAnswersAfterEach: v })} />
          <div className="space-y-1.5">
            <Label>Violation limit</Label>
            <Input type="number" min={1} max={20} value={cfg.violationLimit}
              onChange={e => setCfg({ ...cfg, violationLimit: Math.max(1, Number(e.target.value) || 1) })} />
            <p className="text-[11px] text-muted-foreground">Auto-submit after this many proctoring violations.</p>
          </div>
        </div>
        <div className="flex justify-end mt-5">
          <Button onClick={saveCbt} disabled={saving}>
            {saving ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Settings2 className="size-3.5 mr-1.5" />}
            Save CBT settings
          </Button>
        </div>
      </SectionCard>
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border p-3">
      <div className="min-w-0">
        <Label className="text-sm">{label}</Label>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}