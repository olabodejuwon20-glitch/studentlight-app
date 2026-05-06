import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Plus, ArrowRight, Loader2, Building2, Ticket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool, ROLE_META, Role } from "@/contexts/SchoolContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);

export default function Onboarding() {
  const navigate = useNavigate();
  const { user, memberships, refreshMemberships, signOut, displayName } = useSchool();
  const [busy, setBusy] = useState(false);
  const [schoolMap, setSchoolMap] = useState<Record<string, { name: string; slug: string }>>({});

  // create school
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  // join
  const [code, setCode] = useState("");

  useEffect(() => { if (!user) navigate("/auth", { replace: true }); }, [user, navigate]);

  useEffect(() => {
    if (memberships.length === 0) return;
    supabase.from("schools").select("id,name,slug").in("id", memberships.map(m => m.school_id))
      .then(({ data }) => {
        const map: Record<string, any> = {};
        (data ?? []).forEach((s: any) => map[s.id] = s);
        setSchoolMap(map);
      });
  }, [memberships]);

  function goToSchool(slug: string) {
    const url = new URL(window.location.href);
    if (url.hostname.endsWith(".lovable.app") || url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      url.searchParams.set("school", slug);
      url.pathname = "/app";
      window.location.href = url.toString();
    } else {
      window.location.href = `${url.protocol}//${slug}.${url.hostname.split(".").slice(-2).join(".")}/app`;
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const finalSlug = slugify(slug || trimmedName);
    const { data: authState } = await supabase.auth.getSession();
    const currentUser = authState.session?.user ?? user;

    if (!currentUser) {
      toast.error("Your session is not ready yet. Please sign in again and retry.");
      return;
    }

    if (!trimmedName || !finalSlug) {
      toast.error("Enter a school name and slug.");
      return;
    }

    setBusy(true);
    const { error } = await supabase
      .from("schools")
      .insert({ name: trimmedName, slug: finalSlug, created_by: currentUser.id });

    setBusy(false);
    if (error) {
      const isPolicyError = error.code === "42501" || /row-level security/i.test(error.message);
      return toast.error(isPolicyError ? "Your account session is not allowed to create this school yet. Please sign out, sign back in, then try again." : error.message.includes("schools_slug_key") ? "That slug is taken" : error.message);
    }

    toast.success("School created");
    await refreshMemberships();
    goToSchool(finalSlug);
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.rpc("redeem_invite", { _code: code.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Joined school");
    await refreshMemberships();
    const { data: s } = await supabase.from("schools").select("slug").eq("id", data as string).single();
    if (s?.slug) goToSchool(s.slug);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid place-items-center size-9 rounded-lg bg-primary text-primary-foreground"><GraduationCap className="size-5" /></div>
            <span className="font-display font-bold text-lg">EduSmart</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{displayName}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>Sign out</Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="font-display text-3xl font-bold">Welcome{displayName ? `, ${displayName.split(" ")[0]}` : ""}</h1>
        <p className="text-muted-foreground mt-2">Open one of your schools, create a new one, or join with an invite code.</p>

        {memberships.length > 0 && (
          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">Your schools</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {memberships.map(m => {
                const s = schoolMap[m.school_id];
                return (
                  <button key={m.school_id} onClick={() => s && goToSchool(s.slug)}
                    className="flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:shadow-card transition-all text-left">
                    <div className="size-11 rounded-lg grid place-items-center text-white" style={{ background: ROLE_META[m.role as Role].color }}>
                      <Building2 className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{s?.name || "School"}</div>
                      <div className="text-xs text-muted-foreground capitalize">{m.role} · {s?.slug}</div>
                    </div>
                    <ArrowRight className="size-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="mt-10 grid lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Plus className="size-4 text-primary" />
              <h3 className="font-display font-semibold">Create a school</h3>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label>School name</Label>
                <Input required value={name} onChange={e => { setName(e.target.value); if (!slug) setSlug(slugify(e.target.value)); }} placeholder="Greenfield Academy" />
              </div>
              <div className="space-y-2">
                <Label>Slug (subdomain)</Label>
                <Input required value={slug} onChange={e => setSlug(slugify(e.target.value))} placeholder="greenfield" />
                <p className="text-[11px] text-muted-foreground">Your portal URL: {slug || "your-school"}.edusmart.app</p>
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" />} Create school
              </Button>
            </form>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Ticket className="size-4 text-primary" />
              <h3 className="font-display font-semibold">Join with a code</h3>
            </div>
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-2">
                <Label>Invite code</Label>
                <Input required value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. GREEN-STU-AB12" />
                <p className="text-[11px] text-muted-foreground">Get this from your school's admin.</p>
              </div>
              <Button type="submit" variant="secondary" className="w-full" disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" />} Join school
              </Button>
            </form>
          </Card>
        </section>
      </main>
    </div>
  );
}
