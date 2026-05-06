import { useMemo, useState } from "react";
import { Building2, Loader2, Plus, Copy, ExternalLink, Check, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);

function buildSubdomainUrl(slug: string) {
  if (typeof window === "undefined") return `https://${slug}.edusmart.app`;
  const host = window.location.hostname;
  const isPreview =
    host === "localhost" ||
    host === "127.0.0.1" ||
    host.endsWith(".lovable.app") ||
    host.endsWith(".lovableproject.com");
  if (isPreview) {
    const url = new URL(window.location.origin);
    url.pathname = "/app";
    url.searchParams.set("school", slug);
    return url.toString();
  }
  const root = host.split(".").slice(-2).join(".");
  return `${window.location.protocol}//${slug}.${root}/app`;
}

export default function CreateSchool() {
  const { user, refreshMemberships } = useSchool();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ name: string; slug: string; url: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const previewSlug = useMemo(() => slugify(slug || name), [slug, name]);
  const previewUrl = useMemo(() => (previewSlug ? buildSubdomainUrl(previewSlug) : ""), [previewSlug]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const finalName = name.trim();
    const finalSlug = slugify(slug || name);
    if (!finalName || !finalSlug) return toast.error("Enter a school name and slug.");
    if (!user) return toast.error("Your session is not ready. Please sign in again.");

    setBusy(true);
    const { error } = await supabase.from("schools").insert({
      name: finalName,
      slug: finalSlug,
      created_by: user.id,
      phone: phone.trim() || null,
      email: email.trim() || null,
      address: address.trim() || null,
    });
    setBusy(false);

    if (error) {
      if (error.message.includes("schools_slug_key")) return toast.error("That slug is already taken.");
      return toast.error(error.message);
    }

    toast.success("School created");
    await refreshMemberships();
    setCreated({ name: finalName, slug: finalSlug, url: buildSubdomainUrl(finalSlug) });
    setName(""); setSlug(""); setPhone(""); setEmail(""); setAddress("");
  }

  async function copyUrl() {
    if (!created) return;
    await navigator.clipboard.writeText(created.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("Subdomain URL copied");
  }

  return (
    <div className="max-w-3xl space-y-6">
      {created && (
        <Card className="p-6 border-primary/30 bg-primary/5">
          <div className="flex items-start gap-4">
            <div className="grid place-items-center size-11 rounded-lg bg-primary text-primary-foreground shrink-0">
              <Globe className="size-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display text-lg font-semibold">{created.name} is live</div>
              <p className="text-sm text-muted-foreground mt-1">
                Members of this school can sign in at their dedicated subdomain.
              </p>
              <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-background border border-border">
                <Building2 className="size-4 text-muted-foreground shrink-0" />
                <code className="text-sm font-mono truncate flex-1">{created.url}</code>
                <Button variant="ghost" size="icon" onClick={copyUrl} title="Copy URL">
                  {copied ? <Check className="size-4 text-primary" /> : <Copy className="size-4" />}
                </Button>
                <Button variant="ghost" size="icon" asChild title="Open">
                  <a href={created.url} target="_blank" rel="noreferrer"><ExternalLink className="size-4" /></a>
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Production format: <span className="font-mono">{created.slug}.edusmart.app</span>
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-1">
          <Plus className="size-4 text-primary" />
          <h2 className="font-display font-semibold">Create a new school</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          Each school gets its own private subdomain. Members sign in there with their phone + PIN.
        </p>

        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label>School name *</Label>
              <Input
                required
                value={name}
                onChange={(e) => { setName(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }}
                placeholder="Greenfield Academy"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Slug (subdomain) *</Label>
              <div className="flex rounded-md border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring">
                <Input
                  required
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                  placeholder="greenfield"
                  className="border-0 focus-visible:ring-0 rounded-none"
                />
                <span className="px-3 grid place-items-center text-sm text-muted-foreground bg-muted border-l border-input">
                  .edusmart.app
                </span>
              </div>
              {previewUrl && (
                <p className="text-[11px] text-muted-foreground break-all">
                  Portal URL: <span className="font-mono">{previewUrl}</span>
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Contact phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+233..." />
            </div>
            <div className="space-y-2">
              <Label>Contact email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@school.com" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Address</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, city, country" />
            </div>
          </div>

          <Button type="submit" disabled={busy} className="w-full sm:w-auto">
            {busy && <Loader2 className="size-4 animate-spin mr-2" />}
            Create school
          </Button>
        </form>
      </Card>
    </div>
  );
}