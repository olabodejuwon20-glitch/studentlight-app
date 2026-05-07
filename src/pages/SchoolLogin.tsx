import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { GraduationCap, Loader2, Phone, KeyRound, Building2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { schoolPath, buildSchoolUrl } from "@/lib/tenant";

/** /:slug/signin — returning members (student/teacher/parent): phone + 6-digit PIN. */
export default function SchoolLogin() {
  const navigate = useNavigate();
  const { session, loading, school, schoolLoading, memberships } = useSchool();
  const [busy, setBusy] = useState(false);
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (!session || !school) return;
    if (memberships.find(m => m.school_id === school.id)) navigate(schoolPath(school.slug, "/app"), { replace: true });
  }, [session, school, memberships, navigate]);

  if (loading || schoolLoading) return <div className="min-h-screen grid place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  if (!school) return <Navigate to="/" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("phone-auth", {
        body: { phone, schoolSlug: school!.slug },
      });
      if (error) throw new Error(error.message);
      if ((data as any)?.error) throw new Error((data as any).error);
      const email = (data as any).email as string;
      const mustChange = !!(data as any).mustChangePin;
      const { error: sErr } = await supabase.auth.signInWithPassword({ email, password: pin });
      if (sErr) throw new Error("PIN doesn't match. Try again.");
      toast.success("Welcome");
      window.location.href = schoolPath(school!.slug, mustChange ? "/change-pin" : "/app");
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-background grid place-items-center p-6">
      <Card className="w-full max-w-md p-8">
        <Link to={schoolPath(school.slug, "")} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4">
          <ArrowLeft className="size-3.5" /> Back
        </Link>
        <div className="flex items-center gap-2 mb-5">
          <div className="grid place-items-center size-9 rounded-lg bg-primary text-primary-foreground"><GraduationCap className="size-5" /></div>
          <span className="font-display font-bold text-lg">EduSmart</span>
        </div>
        <div className="mb-5 flex items-center gap-3 p-3 rounded-lg bg-muted/60 border border-border">
          <div className="size-9 rounded-md bg-primary/10 grid place-items-center"><Building2 className="size-4 text-primary" /></div>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{school.name}</div>
            <div className="text-[11px] text-muted-foreground truncate">{buildSchoolUrl(school.slug, "")}</div>
          </div>
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground mt-1">Enter your phone number and 6-digit PIN.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-2"><Label className="flex items-center gap-1.5"><Phone className="size-3.5"/>Phone number</Label>
            <Input required type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+233 555 000 000" /></div>
          <div className="space-y-2"><Label className="flex items-center gap-1.5"><KeyRound className="size-3.5"/>6-digit PIN</Label>
            <Input required inputMode="numeric" pattern="\d{6}" maxLength={6} value={pin} onChange={e=>setPin(e.target.value.replace(/\D/g,""))} placeholder="••••••" />
            <p className="text-[11px] text-muted-foreground">Bulk-onboarded? Default PIN is 123456 — you'll be asked to change it.</p></div>
          <Button type="submit" className="w-full" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin mr-1.5"/>}Sign in</Button>
          <p className="text-xs text-muted-foreground text-center">First time?{" "}
            <Link to={schoolPath(school.slug, "/join")} className="text-primary font-medium">Use your onboarding code</Link></p>
        </form>
      </Card>
    </div>
  );
}