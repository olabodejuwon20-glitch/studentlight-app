import { useEffect } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { GraduationCap, Loader2, Building2, LogIn, UserPlus, ShieldCheck } from "lucide-react";
import { useSchool } from "@/contexts/SchoolContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { schoolPath, buildSchoolUrl } from "@/lib/tenant";
import { SchoolBadge } from "@/components/SchoolBadge";

/** Public landing for a school portal: /:slug — choose Sign in or Create account. */
export default function SchoolHome() {
  const navigate = useNavigate();
  const { session, loading, school, schoolLoading, memberships } = useSchool();

  useEffect(() => {
    if (!session || !school) return;
    if (memberships.find(m => m.school_id === school.id)) navigate(schoolPath(school.slug, "/app"), { replace: true });
  }, [session, school, memberships, navigate]);

  if (loading || schoolLoading) return <div className="min-h-screen grid place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  if (!school) return <Navigate to="/" replace />;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-5xl px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid place-items-center size-9 rounded-lg bg-primary text-primary-foreground"><GraduationCap className="size-5" /></div>
            <span className="font-display font-bold text-lg tracking-tight">Legacyskool</span>
          </Link>
          <Link to={schoolPath(school.slug, "/admin")} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
            <ShieldCheck className="size-3.5" /> Admin sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
        <div className="max-w-2xl mx-auto">
          <SchoolBadge name={school.name} logoUrl={school.logo_url} subtitle="Welcome to your school portal" />
          <div className="text-center -mt-2">
            <div className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-secondary text-secondary-foreground border border-border">
              <Building2 className="size-3.5 text-primary" /> {buildSchoolUrl(school.slug, "")}
            </div>
          </div>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
          <Card className="p-7 hover:border-primary/40 transition-colors group">
            <div className="size-11 rounded-xl bg-primary/10 text-primary grid place-items-center"><LogIn className="size-5" /></div>
            <h2 className="font-display text-xl font-semibold mt-4">Sign in</h2>
            <p className="text-sm text-muted-foreground mt-1.5">Already have an account? Use your phone and 6-digit PIN.</p>
            <Button className="w-full mt-5" onClick={() => navigate(schoolPath(school.slug, "/signin"))}>Sign in</Button>
          </Card>

          <Card className="p-7 hover:border-primary/40 transition-colors group">
            <div className="size-11 rounded-xl bg-primary/10 text-primary grid place-items-center"><UserPlus className="size-5" /></div>
            <h2 className="font-display text-xl font-semibold mt-4">Create account</h2>
            <p className="text-sm text-muted-foreground mt-1.5">First time? Enter the onboarding code from your school.</p>
            <Button variant="outline" className="w-full mt-5" onClick={() => navigate(schoolPath(school.slug, "/join"))}>Use onboarding code</Button>
          </Card>
        </div>
      </main>
    </div>
  );
}