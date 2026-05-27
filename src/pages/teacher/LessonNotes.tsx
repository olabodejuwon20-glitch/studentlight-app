import { useEffect, useState } from "react";
import { Sparkles, Save, Send, Loader2, BookOpen, Trash2, Pencil, CheckCircle2, Clock, XCircle, FileEdit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { friendlyError, friendlyInvokeError } from "@/lib/errors";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type Note = {
  id: string; title: string; subject: string | null; grade_level: string | null;
  topic: string | null; duration_min: number | null; content: string;
  status: "draft" | "pending" | "approved" | "rejected";
  admin_feedback: string | null; created_at: string;
};

const STATUS: Record<Note["status"], { label: string; icon: any; cls: string }> = {
  draft:    { label: "Draft",        icon: FileEdit,     cls: "bg-muted text-muted-foreground" },
  pending:  { label: "Pending",      icon: Clock,        cls: "bg-warning/15 text-warning-foreground border border-warning/30" },
  approved: { label: "Approved",     icon: CheckCircle2, cls: "bg-success/15 text-success border border-success/30" },
  rejected: { label: "Needs revision", icon: XCircle,    cls: "bg-destructive/15 text-destructive border border-destructive/30" },
};

export default function TeacherLessonNotes() {
  const { school, user } = useSchool();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [preview, setPreview] = useState<Note | null>(null);

  const empty = { title: "", subject: "", grade_level: "", topic: "", duration_min: 40, objectives: "", notes: "", content: "" };
  const [form, setForm] = useState<any>(empty);

  const load = async () => {
    if (!school || !user) return;
    setLoading(true);
    const { data } = await supabase
      .from("lesson_notes").select("*")
      .eq("school_id", school.id).eq("teacher_id", user.id)
      .order("created_at", { ascending: false });
    setNotes((data ?? []) as Note[]); setLoading(false);
  };
  useEffect(() => { load(); }, [school, user]);

  async function generate() {
    if (!form.subject?.trim() || !form.topic?.trim()) {
      return toast.error("Subject and topic are required");
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-lesson-note", { body: form });
      if (error) throw new Error(await friendlyInvokeError(error, "We couldn't generate the lesson note. Please try again."));
      if (data?.error) throw new Error(data.error);
      setForm((f: any) => ({ ...f, content: data.content, title: f.title || `${f.subject} — ${f.topic}` }));
      toast.success("Lesson note generated");
    } catch (e: any) { toast.error(friendlyError(e, "We couldn't generate the lesson note. Please try again.")); }
    finally { setGenerating(false); }
  }

  async function save(status: "draft" | "pending") {
    if (!school || !user) return;
    if (!form.content?.trim()) return toast.error("Generate or write the content first");
    if (!form.title?.trim()) return toast.error("Title is required");
    setSaving(true);
    const payload = {
      school_id: school.id, teacher_id: user.id,
      title: form.title.trim(), subject: form.subject || null,
      grade_level: form.grade_level || null, topic: form.topic || null,
      duration_min: Number(form.duration_min) || null,
      content: form.content, status,
      admin_feedback: status === "pending" ? null : undefined,
    };
    const q = editId
      ? supabase.from("lesson_notes").update(payload).eq("id", editId)
      : supabase.from("lesson_notes").insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(status === "pending" ? "Submitted for approval" : "Saved as draft");
    setForm(empty); setEditId(null); await load();
  }

  function edit(n: Note) {
    setEditId(n.id);
    setForm({
      title: n.title, subject: n.subject ?? "", grade_level: n.grade_level ?? "",
      topic: n.topic ?? "", duration_min: n.duration_min ?? 40,
      objectives: "", notes: "", content: n.content,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(id: string) {
    if (!confirm("Delete this lesson note?")) return;
    const { error } = await supabase.from("lesson_notes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); await load();
  }

  async function resubmit(n: Note) {
    const { error } = await supabase.from("lesson_notes").update({ status: "pending", admin_feedback: null }).eq("id", n.id);
    if (error) return toast.error(error.message);
    toast.success("Re-submitted"); await load();
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title={editId ? "Edit lesson note" : "AI lesson note generator"}
        description="Fill in the lesson details, let AI draft a complete, well-structured note, then submit for admin approval."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Title">
            <Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Photosynthesis in Green Plants" />
          </Field>
          <Field label="Subject *">
            <Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Biology" />
          </Field>
          <Field label="Class / Grade">
            <Input value={form.grade_level} onChange={e => setForm({ ...form, grade_level: e.target.value })} placeholder="JSS 2" />
          </Field>
          <Field label="Duration (minutes)">
            <Input type="number" value={form.duration_min} onChange={e => setForm({ ...form, duration_min: e.target.value })} />
          </Field>
          <Field label="Topic *" className="md:col-span-2">
            <Input value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} placeholder="Photosynthesis" />
          </Field>
          <Field label="Objectives (optional)" className="md:col-span-2">
            <Textarea rows={2} value={form.objectives} onChange={e => setForm({ ...form, objectives: e.target.value })} placeholder="What students should learn…" />
          </Field>
          <Field label="Additional notes (optional)" className="md:col-span-2">
            <Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Class context, special requirements…" />
          </Field>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Sparkles className="size-4 mr-2" />}
            {form.content ? "Regenerate with AI" : "Generate with AI"}
          </Button>
          {editId && <Button variant="ghost" onClick={() => { setForm(empty); setEditId(null); }}>Cancel edit</Button>}
        </div>

        {form.content && (
          <div className="mt-5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Generated content (edit freely)</Label>
            <Textarea
              rows={14}
              className="mt-2 font-mono text-sm"
              value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })}
            />
            <div className="mt-3 flex flex-wrap justify-end gap-2">
              <Button variant="outline" onClick={() => save("draft")} disabled={saving}>
                {saving ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Save className="size-4 mr-2" />}Save draft
              </Button>
              <Button onClick={() => save("pending")} disabled={saving}>
                <Send className="size-4 mr-2" />Submit for approval
              </Button>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="My lesson notes" description="Track approval status and revisit past notes.">
        {loading ? (
          <div className="py-10 text-center text-muted-foreground"><Loader2 className="size-5 animate-spin inline" /></div>
        ) : notes.length === 0 ? (
          <EmptyState icon={BookOpen} title="No lesson notes yet" desc="Generate your first note above." />
        ) : (
          <ul className="space-y-3">
            {notes.map(n => {
              const s = STATUS[n.status];
              return (
                <li key={n.id} className="rounded-lg border border-border p-4 bg-card">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold truncate">{n.title}</h4>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${s.cls}`}>
                          <s.icon className="size-3" />{s.label}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {[n.subject, n.grade_level, n.topic, n.duration_min ? `${n.duration_min} min` : null].filter(Boolean).join(" · ")}
                      </div>
                      {n.admin_feedback && (
                        <div className="mt-2 text-xs rounded-md border border-destructive/30 bg-destructive/5 text-destructive p-2">
                          <span className="font-semibold">Admin feedback:</span> {n.admin_feedback}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => setPreview(n)}>View</Button>
                      {(n.status === "draft" || n.status === "rejected") && (
                        <Button size="icon" variant="ghost" onClick={() => edit(n)}><Pencil className="size-4" /></Button>
                      )}
                      {n.status === "rejected" && (
                        <Button size="sm" variant="outline" onClick={() => resubmit(n)}><Send className="size-4 mr-1" />Resubmit</Button>
                      )}
                      {n.status !== "approved" && (
                        <Button size="icon" variant="ghost" onClick={() => remove(n.id)}><Trash2 className="size-4 text-destructive" /></Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{preview?.title}</DialogTitle></DialogHeader>
          <div className="text-xs text-muted-foreground">
            {[preview?.subject, preview?.grade_level, preview?.topic].filter(Boolean).join(" · ")}
          </div>
          <pre className="whitespace-pre-wrap text-sm font-sans mt-3">{preview?.content}</pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="text-xs">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}