import { useEffect, useMemo, useState } from "react";
import { AIMarkdown } from "@/components/ai/AIMarkdown";
import {
  Sparkles, Loader2, Save, Trash2, BookOpen, Send, FileText, Wand2, Pencil,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  subject: string;
  topic: string;
  grade_level: string | null;
  curriculum: string | null;
  duration_minutes: number;
  content: string;
  status: "draft" | "approved" | "shared" | "archived";
  class_id: string | null;
  updated_at: string;
}

const CURRICULA = ["WAEC", "NECO", "JAMB", "NERDC"];

export default function TeacherLessonPlan() {
  const { school, user } = useSchool();
  const [classes, setClasses] = useState<{ id: string; name: string; subject: string | null; grade_level: string | null }[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    subject: "", topic: "", grade_level: "SS2", duration_minutes: 40,
    curriculum: "WAEC", class_id: "", notes: "",
  });
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const active = useMemo(() => plans.find(p => p.id === activeId) ?? null, [plans, activeId]);

  useEffect(() => {
    if (!school || !user) return;
    (async () => {
      const [{ data: cls }, { data: lp }] = await Promise.all([
        supabase.from("classes").select("id,name,subject,grade_level")
          .eq("school_id", school.id).order("name"),
        supabase.from("lesson_plans").select("*")
          .eq("teacher_id", user.id).order("updated_at", { ascending: false }).limit(60),
      ]);
      setClasses(cls ?? []);
      setPlans((lp ?? []) as Plan[]);
      if (!activeId && lp && lp.length) setActiveId(lp[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [school, user]);

  function onPickClass(id: string) {
    setDraft(d => ({ ...d, class_id: id }));
    const c = classes.find(x => x.id === id);
    if (c) {
      setDraft(d => ({
        ...d,
        class_id: id,
        subject: c.subject || d.subject,
        grade_level: c.grade_level || d.grade_level,
      }));
    }
  }

  async function generate() {
    if (!school || !user) return;
    if (!draft.subject || !draft.topic) {
      toast.error("Subject and topic are required");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-lesson-plan", {
        body: {
          school_id: school.id,
          subject: draft.subject,
          topic: draft.topic,
          grade_level: draft.grade_level,
          duration_minutes: Number(draft.duration_minutes) || 40,
          curriculum: draft.curriculum,
          class_id: draft.class_id || null,
          notes: draft.notes,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const plan = data?.plan as Plan;
      setPlans(ps => [plan, ...ps]);
      setActiveId(plan.id);
      toast.success("Lesson plan drafted by AI — review & approve");
    } catch (e: any) {
      toast.error(e?.message || "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function saveActive(patch: Partial<Plan>) {
    if (!active) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.from("lesson_plans")
        .update(patch)
        .eq("id", active.id)
        .select().single();
      if (error) throw error;
      setPlans(ps => ps.map(p => p.id === active.id ? (data as Plan) : p));
      toast.success("Saved");
    } catch (e: any) {
      toast.error(e?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this lesson plan?")) return;
    const { error } = await supabase.from("lesson_plans").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setPlans(ps => ps.filter(p => p.id !== id));
    if (activeId === id) setActiveId(null);
  }

  async function convertToAssessment() {
    if (!active || !school || !user) return;
    toast.info("Generating assessment from this lesson…");
    try {
      // 1) create a parent assessment record
      const { data: assessment, error: aerr } = await supabase.from("assessments").insert({
        school_id: school.id,
        created_by: user.id,
        title: `${active.topic} — quick check`,
        type: "school_test",
        config: { duration_minutes: 20, subject: active.subject },
        status: "draft",
      }).select().single();
      if (aerr) throw aerr;
      // 2) ask question generator to populate it
      const { error: gerr } = await supabase.functions.invoke("generate-questions", {
        body: {
          assessment_id: assessment.id,
          subject: active.subject,
          topic: active.topic,
          grade_level: active.grade_level || "SS2",
          curriculum: active.curriculum || "WAEC",
          count: 10,
          difficulty: "mixed",
        },
      });
      if (gerr) throw gerr;
      toast.success("Assessment created — review questions in Assessments");
    } catch (e: any) {
      toast.error(e?.message || "Failed to create assessment");
    }
  }

  return (
    <div className="grid lg:grid-cols-[320px,1fr] gap-6">
      {/* Left: drafts list + generator */}
      <div className="space-y-4">
        <SectionCard
          title={<span className="flex items-center gap-2"><Wand2 className="size-4 text-primary" /> New AI lesson plan</span>}
          description="Tell the AI what to draft — review and approve before sharing"
        >
          <div className="space-y-3">
            {classes.length > 0 && (
              <div>
                <Label className="text-xs">Class (optional)</Label>
                <Select value={draft.class_id} onValueChange={onPickClass}>
                  <SelectTrigger><SelectValue placeholder="Pick a class" /></SelectTrigger>
                  <SelectContent>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} {c.subject ? `· ${c.subject}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Subject</Label>
                <Input value={draft.subject}
                  onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))}
                  placeholder="Biology" />
              </div>
              <div>
                <Label className="text-xs">Class</Label>
                <Input value={draft.grade_level}
                  onChange={e => setDraft(d => ({ ...d, grade_level: e.target.value }))}
                  placeholder="SS2" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Topic</Label>
              <Input value={draft.topic}
                onChange={e => setDraft(d => ({ ...d, topic: e.target.value }))}
                placeholder="e.g. Photosynthesis" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Minutes</Label>
                <Input type="number" min={15} max={180} value={draft.duration_minutes}
                  onChange={e => setDraft(d => ({ ...d, duration_minutes: Number(e.target.value) }))} />
              </div>
              <div>
                <Label className="text-xs">Curriculum</Label>
                <Select value={draft.curriculum}
                  onValueChange={v => setDraft(d => ({ ...d, curriculum: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRICULA.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes for the AI (optional)</Label>
              <Textarea rows={2} value={draft.notes}
                onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
                placeholder="Focus on practical applications…" />
            </div>
            <Button className="w-full gap-2" onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {generating ? "Drafting…" : "Generate with AI"}
            </Button>
          </div>
        </SectionCard>

        <SectionCard title={<span className="flex items-center gap-2"><BookOpen className="size-4 text-primary" /> Your plans</span>}>
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">No plans yet — generate one above.</p>
          ) : (
            <ul className="space-y-1.5">
              {plans.map(p => (
                <li key={p.id}>
                  <button
                    onClick={() => setActiveId(p.id)}
                    className={cn(
                      "w-full text-left rounded-lg border border-border bg-background hover:bg-secondary/60 px-3 py-2 transition-colors",
                      activeId === p.id && "ring-2 ring-primary border-primary"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate flex-1">{p.topic}</span>
                      <StatusBadge status={p.status} />
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {p.subject} · {p.grade_level || "—"} · {p.duration_minutes}m
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* Right: preview + edit */}
      <div>
        {!active ? (
          <EmptyState
            icon={BookOpen}
            title="No lesson plan selected"
            desc="Pick a plan on the left or draft a new one with AI."
          />
        ) : (
          <SectionCard
            title={<span className="flex items-center gap-2"><BookOpen className="size-4 text-primary" /> {active.topic}</span>}
            description={`${active.subject} · ${active.grade_level || "—"} · ${active.duration_minutes} min · ${active.curriculum || "—"}`}
            action={
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={active.status} />
                {active.status === "draft" && (
                  <Button size="sm" variant="outline" onClick={() => saveActive({ status: "approved" })}>
                    Approve
                  </Button>
                )}
                {active.status === "approved" && (
                  <Button size="sm" variant="outline" onClick={() => saveActive({ status: "shared" })}>
                    <Send className="size-3.5 mr-1.5" /> Mark shared
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={convertToAssessment}>
                  <Wand2 className="size-3.5 mr-1.5" /> Convert to assessment
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(active.id)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            }
          >
            <EditableContent
              key={active.id}
              initial={active.content}
              saving={saving}
              onSave={(content) => saveActive({ content })}
            />
          </SectionCard>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const variant: "default" | "secondary" | "outline" =
    status === "approved" ? "default"
    : status === "shared" ? "secondary"
    : "outline";
  return <Badge variant={variant} className="capitalize">{status}</Badge>;
}

function EditableContent({ initial, saving, onSave }: {
  initial: string; saving: boolean; onSave: (s: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(initial);
  useEffect(() => { setDraft(initial); setEditing(false); }, [initial]);

  if (editing) {
    return (
      <div className="space-y-3">
        <Textarea rows={28} value={draft}
          onChange={e => setDraft(e.target.value)}
          className="font-mono text-xs" />
        <div className="flex gap-2">
          <Button size="sm" onClick={() => { onSave(draft); setEditing(false); }} disabled={saving}>
            {saving ? <Loader2 className="size-3.5 mr-1.5 animate-spin" /> : <Save className="size-3.5 mr-1.5" />}
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={() => { setDraft(initial); setEditing(false); }}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <AIMarkdown content={initial} compact />
      <div className="mt-3">
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
          <Pencil className="size-3.5 mr-1.5" /> Edit
        </Button>
      </div>
    </div>
  );
}