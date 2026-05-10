import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { buildSchoolUrl } from "@/lib/tenant";
import { Copy, Upload, Loader2, Image as ImageIcon } from "lucide-react";

export default function AdminSettings() {
  const { school } = useSchool();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [info, setInfo] = useState({ name: "", email: "", phone: "", address: "", motto: "" });
  const [academic, setAcademic] = useState({ current_session: "", current_term: "", grading_system: "", resumption_date: "" });

  useEffect(() => {
    if (!school) return;
    supabase.from("schools").select("name,email,phone,address,motto,logo_url,current_session,current_term,grading_system,resumption_date").eq("id", school.id).single()
      .then(({ data }) => {
        if (!data) return;
        setInfo({ name: data.name, email: data.email ?? "", phone: data.phone ?? "", address: data.address ?? "", motto: data.motto ?? "" });
        setAcademic({
          current_session: data.current_session ?? "",
          current_term: data.current_term ?? "",
          grading_system: data.grading_system ?? "",
          resumption_date: data.resumption_date ?? "",
        });
        setLogoUrl(data.logo_url ?? null);
      });
  }, [school]);

  async function saveInfo(e: React.FormEvent) {
    e.preventDefault();
    if (!school) return;
    const { error } = await supabase.from("schools").update(info).eq("id", school.id);
    if (error) toast.error(error.message); else toast.success("School information saved");
  }

  async function saveAcademic(e: React.FormEvent) {
    e.preventDefault();
    if (!school) return;
    const payload = { ...academic, resumption_date: academic.resumption_date || null };
    const { error } = await supabase.from("schools").update(payload).eq("id", school.id);
    if (error) toast.error(error.message); else toast.success("Academic settings saved");
  }

  async function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !school) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Logo must be under 2MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${school.id}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("school-logos").upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("school-logos").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: updErr } = await supabase.from("schools").update({ logo_url: url }).eq("id", school.id);
      if (updErr) throw updErr;
      setLogoUrl(url);
      toast.success("Logo updated — it will appear on your portal login page");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      {school && (
        <div className="p-4 rounded-xl border border-border bg-muted/40">
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
            Share this link with your students, teachers and parents. Onboarding codes only work on this URL.
          </p>
        </div>
      )}

      <SectionCard title="School Information">
        <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={saveInfo}>
          <div><Label>School Name</Label><Input value={info.name} onChange={e => setInfo({ ...info, name: e.target.value })} placeholder="School Name" /></div>
          <div><Label>Address</Label><Input value={info.address} onChange={e => setInfo({ ...info, address: e.target.value })} placeholder="Address" /></div>
          <div><Label>Phone</Label><Input value={info.phone} onChange={e => setInfo({ ...info, phone: e.target.value })} placeholder="Phone" /></div>
          <div><Label>Email</Label><Input type="email" value={info.email} onChange={e => setInfo({ ...info, email: e.target.value })} placeholder="Email" /></div>

          <div className="sm:col-span-1">
            <Label>School Logo</Label>
            <div className="mt-1.5 flex items-center gap-4">
              <div className="size-16 rounded-lg border border-border bg-muted/40 grid place-items-center overflow-hidden shrink-0">
                {logoUrl ? <img src={logoUrl} alt="School logo" className="w-full h-full object-contain" /> : <ImageIcon className="size-5 text-muted-foreground" />}
              </div>
              <div className="flex-1">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onLogoChange} />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Upload className="size-3.5 mr-1.5" />}
                  {logoUrl ? "Replace logo" : "Upload logo"}
                </Button>
                <p className="text-[11px] text-muted-foreground mt-1.5">PNG/JPG up to 2MB. Shown on the school portal sign-in page.</p>
              </div>
            </div>
          </div>

          <div><Label>Motto</Label><Input value={info.motto} onChange={e => setInfo({ ...info, motto: e.target.value })} placeholder="Motto" /></div>

          <div className="sm:col-span-2 flex justify-end"><Button type="submit">Save changes</Button></div>
        </form>
      </SectionCard>

      <SectionCard title="Academic Settings">
        <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={saveAcademic}>
          <div><Label>Current Session</Label><Input value={academic.current_session} onChange={e => setAcademic({ ...academic, current_session: e.target.value })} placeholder="2024/2025" /></div>
          <div><Label>Current Term</Label><Input value={academic.current_term} onChange={e => setAcademic({ ...academic, current_term: e.target.value })} placeholder="Term 1" /></div>
          <div><Label>Grading System</Label><Input value={academic.grading_system} onChange={e => setAcademic({ ...academic, grading_system: e.target.value })} placeholder="A-F" /></div>
          <div><Label>Resumption Date</Label><Input type="date" value={academic.resumption_date} onChange={e => setAcademic({ ...academic, resumption_date: e.target.value })} /></div>
          <div className="sm:col-span-2 flex justify-end"><Button type="submit">Save changes</Button></div>
        </form>
      </SectionCard>
    </div>
  );
}
