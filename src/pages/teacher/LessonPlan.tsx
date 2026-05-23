import { useEffect, useState } from "react";
import { BookOpen, Save, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Plan = { title: string; subject: string; class: string; date: string; duration: string; objectives: string; materials: string; activities: string; assessment: string; homework: string };
const EMPTY: Plan = { title: "", subject: "", class: "", date: "", duration: "", objectives: "", materials: "", activities: "", assessment: "", homework: "" };

/** Lesson plans are stored as ai_chats with role='lesson_plan' and JSON content. */
export default function TeacherLessonPlan() {
  const { school, user } = useSchool();
  const [plans, setPlans] = useState<any[]>([]);
  const [form, setForm] = useState<Plan>(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!school || !user) return;
    const { data } = await supabase.from("ai_chats").select("*").eq("school_id", school.id).eq("user_id", user.id).eq("role", "lesson_plan").order("created_at", { ascending: false });
    setPlans(data ?? []);
  };
  useEffect(() => { load(); }, [school, user]);

  function parse(content: string): Plan | null {
    try { const j = JSON.parse(content); return typeof j === "object" && j ? j : null; } catch { return null; }
  }

  async function add() {
    if (!form.title.trim() || !school || !user) return toast.error("Title is required");
    setBusy(true);
    const { error } = await supabase.from("ai_chats").insert({ school_id: school.id, user_id: user.id, role: "lesson_plan", content: JSON.stringify(form) });
    setBusy(false);
    if (error) return toast.error(error.message);
    setForm(EMPTY); toast.success("Lesson plan saved"); await load();
  }

  async function remove(id: string) {
    await supabase.from("ai_chats").delete().eq("id", id);
    await load();
  }

  const set = (k: keyof Plan) => (e: any) => setForm({ ...form, [k]: e.target.value });

  return (
    <div className="space-y-6">
      <SectionCard title="New lesson plan" description="Structure your next class">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div className="space-y-1"><Label className="text-xs">Title</Label><Input value={form.title} onChange={set("title")} placeholder="Photosynthesis intro" /></div>
          <div className="space-y-1"><Label className="text-xs">Subject</Label><Input value={form.subject} onChange={set("subject")} placeholder="Biology" /></div>
          <div className="space-y-1"><Label className="text-xs">Class</Label><Input value={form.class} onChange={set("class")} placeholder="JSS 2" /></div>
          <div className="space-y-1"><Label className="text-xs">Date</Label><Input type="date" value={form.date} onChange={set("date")} /></div>
          <div className="space-y-1"><Label className="text-xs">Duration (min)</Label><Input type="number" value={form.duration} onChange={set("duration")} placeholder="40" /></div>
        </div>
        <div className="grid lg:grid-cols-2 gap-3 mt-3">
          <div className="space-y-1"><Label className="text-xs">Objectives</Label><Textarea rows={3} value={form.objectives} onChange={set("objectives")} placeholder="By the end of the lesson, students will…" /></div>
          <div className="space-y-1"><Label className="text-xs">Materials</Label><Textarea rows={3} value={form.materials} onChange={set("materials")} placeholder="Charts, slides, lab kits…" /></div>
          <div className="space-y-1"><Label className="text-xs">Activities</Label><Textarea rows={4} value={form.activities} onChange={set("activities")} placeholder="Step-by-step lesson flow" /></div>
          <div className="space-y-1"><Label className="text-xs">Assessment</Label><Textarea rows={4} value={form.assessment} onChange={set("assessment")} placeholder="How learning will be checked" /></div>
          <div className="space-y-1 lg:col-span-2"><Label className="text-xs">Homework</Label><Textarea rows={2} value={form.homework} onChange={set("homework")} placeholder="Optional follow-up tasks" /></div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setForm(EMPTY)}>Clear</Button>
          <Button onClick={add} disabled={busy}>{busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}Save plan</Button>
        </div>
      </SectionCard>

      <SectionCard title="My lesson plans" description={`${plans.length} saved`}>
        {plans.length === 0 ? <EmptyState icon={BookOpen} title="No lesson plans yet" /> :
          <ul className="space-y-3">{plans.map(p => {
            const j = parse(p.content);
            return (
              <li key={p.id} className="rounded-lg border border-border p-4 bg-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold">{j?.title || "Lesson plan"}</div>
                    <div className="text-xs text-muted-foreground">
                      {[j?.subject, j?.class, j?.date && new Date(j.date).toLocaleDateString(), j?.duration && `${j.duration} min`].filter(Boolean).join(" · ") || new Date(p.created_at).toLocaleString()}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => remove(p.id)}><Trash2 className="size-4 text-destructive" /></Button>
                </div>
                {j ? (
                  <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
                    {j.objectives && <Field label="Objectives" v={j.objectives} />}
                    {j.materials && <Field label="Materials" v={j.materials} />}
                    {j.activities && <Field label="Activities" v={j.activities} />}
                    {j.assessment && <Field label="Assessment" v={j.assessment} />}
                    {j.homework && <Field label="Homework" v={j.homework} />}
                  </div>
                ) : <div className="mt-2 text-sm whitespace-pre-wrap">{p.content}</div>}
              </li>
            );
          })}</ul>}
      </SectionCard>
    </div>
  );
}

function Field({ label, v }: { label: string; v: string }) {
  return <div><div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-0.5">{label}</div><div className="whitespace-pre-wrap">{v}</div></div>;
}