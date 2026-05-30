import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, GraduationCap, Loader2, Play, Sparkles, History, BookOpenCheck, Wifi } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { schoolPath } from "@/lib/tenant";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/EmptyState";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Mode = "neco_sim" | "jamb_sim";
const RULES: Record<Mode, { label: string; pick: number; minutes: number; icon: any; locked?: string }> = {
  neco_sim: { label: "NECO Mock", pick: 9, minutes: 150, icon: Award },
  jamb_sim: { label: "JAMB Mock", pick: 4, minutes: 120, icon: GraduationCap, locked: "english" },
};

export default function MockPicker() {
  const { school, user } = useSchool();
  const nav = useNavigate();
  const qc = useQueryClient();
  const [params] = useSearchParams();
  const initialMode: Mode = params.get("body") === "jamb" ? "jamb_sim" : "neco_sim";
  const [mode, setMode] = useState<Mode>(initialMode);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [starting, setStarting] = useState(false);
  const [useReal, setUseReal] = useState(true);

  const { data: subjects, isLoading } = useQuery({
    queryKey: ["mock-subjects", school?.id],
    enabled: !!school,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mock_subjects")
        .select("id, code, name, exam_body, color, sort")
        .eq("school_id", school!.id)
        .order("sort");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: sessions } = useQuery({
    queryKey: ["mock-sessions", school?.id, user?.id],
    enabled: !!school && !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mock_sessions")
        .select("id, mode, started_at, submitted_at, total_score, total_questions, status")
        .eq("school_id", school!.id)
        .eq("student_id", user!.id)
        .order("started_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    if (!subjects) return [];
    if (mode === "jamb_sim") return subjects.filter(s => ["english","math","physics","chemistry","biology","economics","government","literature"].includes(s.code));
    return subjects;
  }, [subjects, mode]);

  const rule = RULES[mode];
  const lockedId = useMemo(() => filtered.find(s => s.code === rule.locked)?.id, [filtered, rule.locked]);

  // Reset on mode change; pre-select locked subject for JAMB
  useEffect(() => {
    const init: Record<string, boolean> = {};
    if (lockedId) init[lockedId] = true;
    setSelected(init);
  }, [mode, lockedId]);

  const chosenCount = Object.values(selected).filter(Boolean).length;

  function toggle(id: string) {
    if (id === lockedId) return;
    setSelected(prev => {
      const next = { ...prev };
      if (next[id]) { delete next[id]; return next; }
      if (chosenCount >= rule.pick) {
        toast.error(`You can only pick ${rule.pick} subjects for ${rule.label}`);
        return prev;
      }
      next[id] = true;
      return next;
    });
  }

  async function start() {
    if (!school || !user) return;
    if (chosenCount !== rule.pick) {
      toast.error(`Pick exactly ${rule.pick} subjects to begin.`);
      return;
    }
    setStarting(true);
    try {
      const selectedIds = Object.keys(selected).filter(id => selected[id]);
      if (useReal) {
        toast.loading("Loading real past questions…", { id: "aloc" });
        const { data: fr, error: fe } = await supabase.functions.invoke("fetch-aloc-questions", {
          body: { school_id: school.id, mode, subject_ids: selectedIds },
        });
        toast.dismiss("aloc");
        if (fe || (fr as any)?.error) {
          toast.warning("Couldn't load real past questions — using practice bank.");
        } else {
          toast.success(`${(fr as any)?.inserted ?? 0} real past questions loaded.`);
        }
      }
      const { data: session, error } = await supabase
        .from("mock_sessions")
        .insert({
          school_id: school.id,
          student_id: user.id,
          mode,
          duration_minutes: rule.minutes,
          total_questions: chosenCount * 20,
        })
        .select("id")
        .single();
      if (error) throw error;
      const rows = selectedIds.map((subject_id, idx) => ({ session_id: session.id, subject_id, sort: idx }));
      const { error: e2 } = await supabase.from("mock_session_subjects").insert(rows);
      if (e2) throw e2;
      qc.invalidateQueries({ queryKey: ["mock-sessions"] });
      nav(schoolPath(school.slug, `/app/student/mock/${session.id}`));
    } catch (e: any) {
      toast.error(e.message ?? "Could not start session");
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="NECO / JAMB Mock"
        description="Practice real exam conditions. Choose your subjects, then sit a timed UTME-style session."
      />

      <Tabs value={mode} onValueChange={v => setMode(v as Mode)}>
        <TabsList>
          <TabsTrigger value="neco_sim"><Award className="size-3.5 mr-1.5" /> NECO (pick 9)</TabsTrigger>
          <TabsTrigger value="jamb_sim"><GraduationCap className="size-3.5 mr-1.5" /> JAMB (pick 4)</TabsTrigger>
        </TabsList>

        <TabsContent value={mode} className="mt-4">
          <SectionCard
            title={`Select your ${rule.pick} subjects`}
            description={mode === "jamb_sim"
              ? "English Language is compulsory. Choose 3 more electives."
              : "Choose any 9 NECO subjects. Each carries 20 questions."}
            action={
              <div className="flex items-center gap-3 flex-wrap justify-end">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Wifi className="size-3.5" />
                  <span className="hidden sm:inline">Real past questions</span>
                  <Switch checked={useReal} onCheckedChange={setUseReal} />
                </label>
                <Button onClick={start} disabled={starting || chosenCount !== rule.pick}>
                  {starting ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Play className="size-3.5 mr-1.5" />}
                  Start ({chosenCount}/{rule.pick})
                </Button>
              </div>
            }
          >
            {isLoading ? (
              <div className="py-10 grid place-items-center text-muted-foreground"><Loader2 className="size-4 animate-spin" /></div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {filtered.map(s => {
                  const on = !!selected[s.id];
                  const locked = s.id === lockedId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggle(s.id)}
                      className={cn(
                        "text-left rounded-xl border p-3 transition-all relative overflow-hidden",
                        on ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border hover:bg-secondary/40",
                        locked && "opacity-95",
                      )}
                    >
                      <div className="h-1 w-12 rounded-full mb-2" style={{ background: s.color }} />
                      <div className="font-semibold text-sm">{s.name}</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">20 questions</div>
                      {locked && <Badge variant="secondary" className="absolute top-2 right-2 text-[9px]">Compulsory</Badge>}
                      {on && !locked && <Badge className="absolute top-2 right-2 text-[9px]">Selected</Badge>}
                    </button>
                  );
                })}
              </div>
            )}
          </SectionCard>
        </TabsContent>
      </Tabs>

      <SectionCard title="Recent sessions" description="Your past mock attempts.">
        {!sessions?.length ? (
          <EmptyState icon={History} title="No sessions yet" desc="Your past attempts will appear here." />
        ) : (
          <ul className="divide-y divide-border">
            {sessions.map(s => (
              <li key={s.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{s.mode === "neco_sim" ? "NECO Mock" : "JAMB Mock"}</div>
                  <div className="text-[11px] text-muted-foreground">{new Date(s.started_at).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-3">
                  {s.status === "in_progress" ? (
                    <Badge variant="secondary">In progress</Badge>
                  ) : (
                    <span className="text-sm font-semibold">{s.total_score ?? 0}/{s.total_questions ?? "—"}</span>
                  )}
                  <Button size="sm" variant={s.status === "in_progress" ? "default" : "outline"}
                    onClick={() => nav(schoolPath(school?.slug, `/app/student/mock/${s.id}`))}>
                    {s.status === "in_progress" ? "Resume" : "Review"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Want low-pressure practice?" description="Use Practice Mode to study your library and your own uploads — no timer, no score." action={
        <Button variant="outline" onClick={() => nav(schoolPath(school?.slug, "/app/student/practice"))}>
          <Sparkles className="size-3.5 mr-1.5" /> Open Practice Mode
        </Button>
      }>
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <BookOpenCheck className="size-4" /> Practice mode reads from your School Library and your personal uploads.
        </div>
      </SectionCard>
    </div>
  );
}
