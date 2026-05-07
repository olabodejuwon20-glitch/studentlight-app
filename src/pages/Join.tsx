import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { GraduationCap, Loader2, User, Phone, KeyRound, Hash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { buildSubdomainUrl } from "@/lib/tenant";

export default function Join() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { school, schoolLoading } = useSchool();
  const [busy, setBusy] = useState(false);

  const [code, setCode] = useState(params.get("code")?.toUpperCase() || "");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => { if (!schoolLoading && !school) navigate("/", { replace: true }); }, [school, schoolLoading, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pin !== confirmPin) return toast.error("PINs don't match");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("join-with-code", {
        body: {
          code, fullName, phone, pin,
          bio: { gender, dob: dob || null, address, photo_url: null, profile_data: {} },
        },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const email = (data as any).email as string;
      const slug = (data as any).schoolSlug as string;
      const { error: sErr } = await supabase.auth.signInWithPassword({ email, password: pin });
      if (sErr) throw sErr;
      toast.success("Welcome to your school");
      window.location.href = buildSubdomainUrl(slug, "/app");
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setBusy(false); }
  }

  if (schoolLoading || !school) return <div className="min-h-screen grid place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid place-items-center size-9 rounded-lg bg-primary text-primary-foreground"><GraduationCap className="size-5" /></div>
            <div><div className="font-display font-bold text-lg leading-none">EduSmart</div><div className="text-[11px] text-muted-foreground mt-1">{school.name}</div></div>
          </div>
          <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">Already a member? Sign in</Link>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-6 py-10">
        <h1 className="font-display text-3xl font-bold">Join {school.name}</h1>
        <p className="text-muted-foreground mt-2">Enter your onboarding code and complete your profile. All fields are required.</p>
        <Card className="mt-6 p-6">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2"><Label className="flex items-center gap-1.5"><Hash className="size-3.5"/>Onboarding code</Label>
              <Input required value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="STU-XXXXX / TCH-XX / PRT-XX" /></div>
            <div className="space-y-2"><Label className="flex items-center gap-1.5"><User className="size-3.5"/>Full name</Label>
              <Input required value={fullName} onChange={e=>setFullName(e.target.value)} /></div>
            <div className="space-y-2"><Label className="flex items-center gap-1.5"><Phone className="size-3.5"/>Phone number</Label>
              <Input required type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+233 555 000 000" /></div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label className="flex items-center gap-1.5"><KeyRound className="size-3.5"/>6-digit PIN</Label>
                <Input required inputMode="numeric" pattern="\d{6}" maxLength={6} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,""))} /></div>
              <div className="space-y-2"><Label>Confirm PIN</Label>
                <Input required inputMode="numeric" pattern="\d{6}" maxLength={6} value={confirmPin} onChange={e=>setConfirmPin(e.target.value.replace(/\D/g,""))} /></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Gender</Label>
                <Select value={gender} onValueChange={setGender}><SelectTrigger><SelectValue placeholder="Select"/></SelectTrigger>
                  <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Date of birth</Label><Input required type="date" value={dob} onChange={e=>setDob(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Address</Label><Textarea required value={address} onChange={e=>setAddress(e.target.value)} rows={2} /></div>
            <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin"/>} Join school</Button>
          </form>
        </Card>
      </main>
    </div>
  );
}