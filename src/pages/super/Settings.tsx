import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Section, Skel } from "@/components/super/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { superAction } from "@/lib/super";

type Settings = {
  brand: { name?: string; logo_url?: string; primary?: string; support_email?: string };
  smtp: { host?: string; port?: number; user?: string; password?: string; from_name?: string; from_email?: string };
  integrations: Record<string, boolean>;
  maintenance_mode: boolean;
  maintenance_message: string | null;
};

const KNOWN_INTEGRATIONS = [
  { key: "paddle", name: "Paddle", desc: "Subscription billing" },
  { key: "resend", name: "Resend", desc: "Transactional email" },
  { key: "sentry", name: "Sentry", desc: "Error tracking" },
  { key: "posthog", name: "PostHog", desc: "Product analytics" },
];

export default function SuperSettings() {
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase.from("platform_settings").select("*").eq("id", 1).maybeSingle();
    if (!data) {
      setS({ brand: {}, smtp: {}, integrations: {}, maintenance_mode: false, maintenance_message: null });
    } else {
      setS({
        brand: (data.brand as any) ?? {},
        smtp: (data.smtp as any) ?? {},
        integrations: (data.integrations as any) ?? {},
        maintenance_mode: data.maintenance_mode,
        maintenance_message: data.maintenance_message,
      });
    }
  }
  useEffect(() => { load(); }, []);

  async function saveFields(fields: Partial<Settings>) {
    setSaving(true);
    try {
      await superAction("update_settings", { fields });
      toast.success("Saved");
    } catch {/* toasted */} finally { setSaving(false); }
  }
  async function saveMaintenance() {
    if (!s) return;
    setSaving(true);
    try {
      await superAction("toggle_maintenance", { enabled: s.maintenance_mode, message: s.maintenance_message });
      toast.success("Maintenance updated");
    } catch {/* toasted */} finally { setSaving(false); }
  }

  if (!s) return <div><PageHeader title="Platform Settings" /><Skel className="h-72" /></div>;

  return (
    <div>
      <PageHeader title="Platform Settings" description="Branding, email infrastructure, integrations and maintenance mode." />

      <Tabs defaultValue="brand">
        <TabsList className="mb-4">
          <TabsTrigger value="brand">Brand</TabsTrigger>
          <TabsTrigger value="smtp">SMTP</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="brand">
          <Section title="Brand">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>Platform name</Label><Input value={s.brand.name ?? ""} onChange={e => setS({ ...s, brand: { ...s.brand, name: e.target.value } })} placeholder="Legacyskool" /></div>
              <div><Label>Support email</Label><Input type="email" value={s.brand.support_email ?? ""} onChange={e => setS({ ...s, brand: { ...s.brand, support_email: e.target.value } })} /></div>
              <div><Label>Logo URL</Label><Input value={s.brand.logo_url ?? ""} onChange={e => setS({ ...s, brand: { ...s.brand, logo_url: e.target.value } })} placeholder="https://…" /></div>
              <div><Label>Primary color</Label><Input value={s.brand.primary ?? ""} onChange={e => setS({ ...s, brand: { ...s.brand, primary: e.target.value } })} placeholder="#0F172A or hsl(…)" /></div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={() => saveFields({ brand: s.brand })} disabled={saving}>{saving ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Save className="size-3.5 mr-1.5" />}Save brand</Button>
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="smtp">
          <Section title="SMTP" description="Outbound email config. Secrets live in Lovable Cloud — this only persists the connection metadata.">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>Host</Label><Input value={s.smtp.host ?? ""} onChange={e => setS({ ...s, smtp: { ...s.smtp, host: e.target.value } })} /></div>
              <div><Label>Port</Label><Input type="number" value={s.smtp.port ?? ""} onChange={e => setS({ ...s, smtp: { ...s.smtp, port: Number(e.target.value) || undefined } })} /></div>
              <div><Label>User</Label><Input value={s.smtp.user ?? ""} onChange={e => setS({ ...s, smtp: { ...s.smtp, user: e.target.value } })} /></div>
              <div><Label>Password</Label><Input type="password" value={s.smtp.password ?? ""} onChange={e => setS({ ...s, smtp: { ...s.smtp, password: e.target.value } })} /></div>
              <div><Label>From name</Label><Input value={s.smtp.from_name ?? ""} onChange={e => setS({ ...s, smtp: { ...s.smtp, from_name: e.target.value } })} /></div>
              <div><Label>From email</Label><Input type="email" value={s.smtp.from_email ?? ""} onChange={e => setS({ ...s, smtp: { ...s.smtp, from_email: e.target.value } })} /></div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={() => saveFields({ smtp: s.smtp })} disabled={saving}>{saving ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Save className="size-3.5 mr-1.5" />}Save SMTP</Button>
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="integrations">
          <Section title="Integrations" description="Toggle availability across the platform. API keys are managed in Lovable Cloud secrets, not here.">
            <ul className="divide-y divide-border -my-2">
              {KNOWN_INTEGRATIONS.map(i => (
                <li key={i.key} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium">{i.name}</div>
                    <div className="text-[11px] text-muted-foreground">{i.desc}</div>
                  </div>
                  <Switch checked={!!s.integrations[i.key]} onCheckedChange={v => setS({ ...s, integrations: { ...s.integrations, [i.key]: v } })} />
                </li>
              ))}
            </ul>
            <div className="flex justify-end mt-4">
              <Button onClick={() => saveFields({ integrations: s.integrations })} disabled={saving}>{saving ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Save className="size-3.5 mr-1.5" />}Save integrations</Button>
            </div>
          </Section>
        </TabsContent>

        <TabsContent value="maintenance">
          <Section title="Maintenance mode" description="Show a banner to every user. Use sparingly.">
            <div className="flex items-center justify-between rounded-md border border-border p-3 mb-3">
              <div>
                <Label>Enable maintenance mode</Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">When on, every tenant sees the message below.</p>
              </div>
              <Switch checked={s.maintenance_mode} onCheckedChange={v => setS({ ...s, maintenance_mode: v })} />
            </div>
            <Label>Message</Label>
            <Textarea rows={3} value={s.maintenance_message ?? ""} onChange={e => setS({ ...s, maintenance_message: e.target.value })} placeholder="We’re upgrading our exam infrastructure. Back at 9pm UTC." />
            <div className="flex justify-end mt-4">
              <Button onClick={saveMaintenance} disabled={saving}>{saving ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Save className="size-3.5 mr-1.5" />}Save maintenance</Button>
            </div>
          </Section>
        </TabsContent>
      </Tabs>
    </div>
  );
}