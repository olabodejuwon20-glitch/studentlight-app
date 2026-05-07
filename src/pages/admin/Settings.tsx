import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { buildSchoolUrl } from "@/lib/tenant";
import { Copy } from "lucide-react";

export default function AdminSettings() {
  const { school } = useSchool();
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });
  useEffect(() => {
    if (!school) return;
    supabase.from("schools").select("name,email,phone,address").eq("id", school.id).single()
      .then(({ data }) => data && setForm({ name: data.name, email: data.email ?? "", phone: data.phone ?? "", address: data.address ?? "" }));
  }, [school]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!school) return;
    const { error } = await supabase.from("schools").update(form).eq("id", school.id);
    if (error) toast.error(error.message); else toast.success("Saved");
  }

  return (
    <SectionCard title="School Profile">
      {school && (
        <div className="mb-6 p-4 rounded-lg border border-border bg-muted/40">
          <div className="text-xs uppercase tracking-wide text-muted-foreground font-semibold">Your school portal URL</div>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 px-3 py-2 rounded-md bg-background border border-border font-mono text-sm break-all">
              {buildSchoolUrl(school.slug, "")}
            </code>
            <Button type="button" variant="outline" size="sm"
              onClick={() => { navigator.clipboard.writeText(buildSchoolUrl(school.slug, "")); toast.success("Copied"); }}>
              <Copy className="size-3.5 mr-1" /> Copy
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Share this link with your students, teachers and parents. Onboarding codes you generate only work on this URL.
          </p>
        </div>
      )}
      <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={save}>
        <div><Label>School name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
        <div><Label>Slug</Label><Input value={school?.slug ?? ""} disabled /></div>
        <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
        <div><Label>Phone</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
        <div className="sm:col-span-2"><Label>Address</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
        <div className="sm:col-span-2 flex justify-end"><Button type="submit">Save changes</Button></div>
      </form>
    </SectionCard>
  );
}
