import { useEffect, useMemo, useState } from "react";
import { Award, Trophy, GraduationCap, ShieldCheck, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { necoGrade, necoSummary, NECO_GRADE_REMARKS, NECO_GRADE_COLORS } from "@/lib/neco";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ResultSlipButton } from "./ResultSlipButton";

interface Props { results: any[] }

export function SchoolResultCard({ results }: Props) {
  const { school, user, displayName } = useSchool();
  const [profile, setProfile] = useState<any>(null);
  const [membership, setMembership] = useState<any>(null);
  const [schoolMeta, setSchoolMeta] = useState<any>(null);

  useEffect(() => {
    if (!user || !school) return;
    (async () => {
      const [{ data: p }, { data: m }, { data: sm }] = await Promise.all([
        supabase.from("profiles").select("full_name,email,photo_url,gender,dob").eq("id", user.id).maybeSingle(),
        supabase.from("memberships").select("profile_data").eq("school_id", school.id).eq("user_id", user.id).maybeSingle(),
        supabase.from("schools").select("motto,current_session,current_term,address").eq("id", school.id).maybeSingle(),
      ]);
      setProfile(p); setMembership(m); setSchoolMeta(sm);
    })();
  }, [user, school]);

  const pdat = membership?.profile_data ?? {};
  const scores = results.map(r => Number(r.score));
  const s = useMemo(() => necoSummary(scores), [results]);
  const initials = (profile?.full_name || displayName || "S").split(" ").map((x: string) => x[0]).join("").slice(0, 2).toUpperCase();

  if (results.length === 0) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Decorative gradient */}
      <div className="absolute inset-0 -z-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--student)/0.15),transparent_60%),radial-gradient(ellipse_at_bottom_left,hsl(var(--primary)/0.12),transparent_55%)]" aria-hidden />

      {/* Header band */}
      <div className="relative px-5 sm:px-7 pt-6 pb-5 border-b border-border bg-gradient-to-r from-primary/10 via-card to-student/10">
        <div className="flex items-start gap-4 flex-wrap">
          {school?.logo_url ? (
            <img src={school.logo_url} alt={school.name} className="size-14 sm:size-16 rounded-xl object-cover bg-background border border-border shrink-0" />
          ) : (
            <div className="size-14 sm:size-16 rounded-xl bg-primary/15 grid place-items-center shrink-0">
              <GraduationCap className="size-7 text-primary" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">School Examination Result</div>
            <h2 className="font-display text-xl sm:text-2xl font-bold mt-0.5 truncate">{school?.name ?? "School"}</h2>
            {schoolMeta?.motto && <p className="text-xs italic text-muted-foreground mt-0.5 line-clamp-1">"{schoolMeta.motto}"</p>}
          </div>
          <Badge variant="secondary" className="hidden sm:inline-flex gap-1.5">
            <ShieldCheck className="size-3" /> Verified
          </Badge>
        </div>
      </div>

      {/* Student bio + headline grade */}
      <div className="relative px-5 sm:px-7 py-5 grid gap-5 sm:grid-cols-[auto_1fr_auto] sm:items-center">
        <Avatar className="size-20 sm:size-24 border-4 border-card ring-2 ring-primary/30">
          <AvatarImage src={profile?.photo_url ?? undefined} alt={profile?.full_name ?? "Student"} />
          <AvatarFallback className="bg-primary/15 text-primary font-display text-2xl font-bold">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="font-display text-lg sm:text-xl font-bold truncate">{profile?.full_name ?? displayName ?? "Student"}</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 mt-2 text-xs">
            <Field label="Admission no" value={pdat.admission_no ?? "—"} />
            <Field label="Class" value={pdat.class ?? "—"} />
            <Field label="Gender" value={profile?.gender ?? "—"} />
            <Field label="Session" value={schoolMeta?.current_session ?? "—"} />
            <Field label="Term" value={schoolMeta?.current_term ?? "—"} />
            <Field label="Issued" value={new Date().toLocaleDateString()} />
          </div>
        </div>
        <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1">
          <div className="text-center sm:text-right">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Overall</div>
            <div className="font-display text-3xl sm:text-4xl font-bold leading-none mt-1" style={{ color: NECO_GRADE_COLORS[s.grade as keyof typeof NECO_GRADE_COLORS] }}>{s.average}%</div>
            <div className="text-xs mt-1 font-semibold" style={{ color: NECO_GRADE_COLORS[s.grade as keyof typeof NECO_GRADE_COLORS] }}>Grade {s.grade}</div>
          </div>
        </div>
      </div>

      {/* Mini stats strip */}
      <div className="relative grid grid-cols-3 divide-x divide-border border-y border-border bg-muted/30 text-center">
        <Stat icon={Trophy} label="Subjects" value={String(results.length)} />
        <Stat icon={Award} label="Best" value={`${s.best}%`} />
        <Stat icon={Calendar} label="Credit pass" value={`${s.credit}%`} />
      </div>

      {/* Subjects table */}
      <div className="relative px-3 sm:px-7 py-5">
        <div className="hidden sm:grid grid-cols-[1fr_80px_70px_1fr] gap-3 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 pb-2 border-b border-border">
          <span>Subject</span><span className="text-right">Score</span><span className="text-center">Grade</span><span>Remark</span>
        </div>
        <ul className="divide-y divide-border">
          {results.map((r) => {
            const sc = Math.round(Number(r.score));
            const g = necoGrade(sc);
            const color = NECO_GRADE_COLORS[g];
            return (
              <li key={r.id} className="grid sm:grid-cols-[1fr_80px_70px_1fr] gap-2 sm:gap-3 items-center py-3 px-2">
                <div className="font-medium text-sm">{r.subject}</div>
                <div className="sm:text-right tabular-nums font-semibold text-sm flex items-center gap-2 sm:block">
                  <span className="sm:hidden text-[10px] uppercase text-muted-foreground">Score:</span> {sc}%
                </div>
                <div className="sm:text-center">
                  <Badge variant="outline" className="font-mono" style={{ background: color + "22", color, borderColor: color + "55" }}>{g}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">{NECO_GRADE_REMARKS[g]}{r.remarks ? ` — ${r.remarks}` : ""}</div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Footer / actions */}
      <div className="relative border-t border-border bg-muted/20 px-5 sm:px-7 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="text-[11px] text-muted-foreground flex-1">
          Authorised academic record issued by {school?.name ?? "the school"}. Verify any printed copy by scanning the QR code on the slip.
        </div>
        <ResultSlipButton studentId={user?.id} size="sm" />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="font-semibold truncate">{value}</div>
    </div>
  );
}
function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="py-3 px-2">
      <Icon className="size-3.5 text-muted-foreground mx-auto mb-1" />
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className="font-display font-bold text-base mt-0.5">{value}</div>
    </div>
  );
}