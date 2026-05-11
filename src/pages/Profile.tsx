import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ProfilePage() {
  const { user, photoUrl, displayName, email, refreshProfile } = useSchool();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", phone: "", address: "", gender: "", dob: "" });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name,phone,address,gender,dob").eq("id", user.id).maybeSingle()
      .then(({ data }) => data && setForm({
        full_name: data.full_name || "",
        phone: data.phone || "",
        address: data.address || "",
        gender: data.gender || "",
        dob: data.dob || "",
      }));
  }, [user]);

  async function uploadPhoto(file: File) {
    if (!user) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, cacheControl: "3600" });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error: dbErr } = await supabase.from("profiles").update({ photo_url: pub.publicUrl }).eq("id", user.id);
      if (dbErr) throw dbErr;
      await refreshProfile();
      toast.success("Profile photo updated");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally { setUploading(false); }
  }

  async function save() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name, phone: form.phone, address: form.address,
      gender: form.gender || null, dob: form.dob || null,
    }).eq("id", user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    await refreshProfile();
    toast.success("Profile saved");
  }

  const initials = (displayName || email || "U").split(/[\s@]/).filter(Boolean).map(s => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="space-y-6 max-w-3xl">
      <SectionCard title="Profile photo" description="Used across your portal and visible to your school">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="relative">
            <Avatar className="size-24 ring-2 ring-background border border-border">
              {photoUrl && <AvatarImage src={photoUrl} alt={displayName} />}
              <AvatarFallback className="text-xl font-semibold bg-primary/10 text-primary">{initials}</AvatarFallback>
            </Avatar>
            <button onClick={() => fileRef.current?.click()} className="absolute -bottom-1 -right-1 size-9 rounded-full bg-primary text-primary-foreground grid place-items-center shadow-md hover:opacity-90">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden
              onChange={e => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
          </div>
          <div className="text-sm text-muted-foreground text-center sm:text-left">
            <div className="font-semibold text-foreground">{displayName || "Your name"}</div>
            <div>{email}</div>
            <p className="mt-2 text-xs">JPG or PNG, up to 5 MB. Click the camera icon to change.</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Personal details">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Full name" value={form.full_name} onChange={v => setForm({ ...form, full_name: v })} />
          <Field label="Phone" value={form.phone} onChange={v => setForm({ ...form, phone: v })} />
          <Field label="Gender" value={form.gender} onChange={v => setForm({ ...form, gender: v })} placeholder="Male / Female" />
          <Field label="Date of birth" type="date" value={form.dob} onChange={v => setForm({ ...form, dob: v })} />
          <div className="sm:col-span-2"><Field label="Address" value={form.address} onChange={v => setForm({ ...form, address: v })} /></div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin mr-2" /> : <Save className="size-4 mr-2" />}Save changes</Button>
        </div>
      </SectionCard>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} />
    </div>
  );
}