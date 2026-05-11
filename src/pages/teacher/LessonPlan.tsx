import { useEffect, useState } from "react";
import { BookOpen, Save, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

/** Lesson plans are stored as ai_chats with role='lesson_plan' to avoid a new table. */
export default function TeacherLessonPlan() {
  const { school, user } = useSchool();
  const [plans, setPlans] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!school || !user) return;
    const { data } = await supabase.from("ai_chats").select("*").eq("school_id", school.id).eq("user_id", user.id).eq("role", "lesson_plan").order("created_at", { ascending: false });
    setPlans(data ?? []);
  };
  useEffect(() => { load(); }, [school, user]);

  async function add() {
    if (!text.trim() || !school || !user) return;
    setBusy(true);
    const { error } = await supabase.from("ai_chats").insert({ school_id: school.id, user_id: user.id, role: "lesson_plan", content: text.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    setText(""); toast.success("Lesson plan saved"); await load();
  }

  return (
    <div className="space-y-6">
      <SectionCard title="New lesson plan">
        <Textarea rows={6} value={text} onChange={e => setText(e.target.value)} placeholder="Topic, objectives, activities, assessment…" />
        <div className="mt-3 flex justify-end"><Button onClick={add} disabled={busy}>{busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}Save</Button></div>
      </SectionCard>
      <SectionCard title="My lesson plans">
        {plans.length === 0 ? <EmptyState icon={BookOpen} title="No lesson plans yet" /> :
          <ul className="space-y-3">{plans.map(p => (
            <li key={p.id} className="rounded-lg border border-border p-4 bg-card">
              <div className="text-xs text-muted-foreground mb-1">{new Date(p.created_at).toLocaleString()}</div>
              <div className="text-sm whitespace-pre-wrap">{p.content}</div>
            </li>
          ))}</ul>}
      </SectionCard>
    </div>
  );
}