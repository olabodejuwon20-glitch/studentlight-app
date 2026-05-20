import { useEffect, useMemo, useState } from "react";
import { FilePlus2, ClipboardList, Loader2, CheckCircle2, XCircle, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function TeacherAssignments() {
  const { school, user } = useSchool();
  const [classes, setClasses] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", subject: "", class_id: "", due_at: "", max_score: 100 });
  const [view, setView] = useState<any | null>(null);
  const [subs, setSubs] = useState<any[]>([]);

  const load = async () => {
    if (!school || !user) return;
    const [{ data: cls }, { data: a }] = await Promise.all([
      supabase.from("classes").select("id,code,name").eq("school_id", school.id).eq("teacher_id", user.id),
      supabase.from("assignments").select("*").eq("school_id", school.id).eq("teacher_id", user.id).order("created_at", { ascending: false }),
    ]);
    setClasses(cls ?? []); setRows(a ?? []);
  };
  useEffect(() => { load(); }, [school, user]);

  async function create() {
    if (!school || !user || !form.title.trim()) return;
    setBusy(true);
    const { error } = await supabase.from("assignments").insert({
      school_id: school.id, teacher_id: user.id,
      title: form.title.trim(), description: form.description || null,
      subject: form.subject || null, class_id: form.class_id || null,
      due_at: form.due_at || null, max_score: Number(form.max_score) || 100,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Assignment created"); setOpen(false);
    setForm({ title: "", description: "", subject: "", class_id: "", due_at: "", max_score: 100 });
    await load();
  }

  async function openView(a: any) {
    setView(a);
    const { data } = await supabase.from("assignment_submissions").select("*").eq("assignment_id", a.id).order("submitted_at", { ascending: false });
    setSubs(data ?? []);
  }

  async function grade(id: string, score: number, feedback: string) {
    const { error } = await supabase.from("assignment_submissions").update({
      score, feedback, graded_by: user!.id, graded_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Graded");
    setSubs(s => s.map(x => x.id === id ? { ...x, score, feedback, graded_at: new Date().toISOString() } : x));
  }

  async function remove(id: string) {
    if (!confirm("Delete this assignment?")) return;
    const { error } = await supabase.from("assignments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); setRows(r => r.filter(x => x.id !== id));
  }

  const totalSubs = useMemo(() => subs.length, [subs]);
  const graded = useMemo(() => subs.filter(s => s.score != null).length, [subs]);

  return (
    <SectionCard title="My Assignments" description="Create homework and grade submissions"
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><FilePlus2 className="size-4 mr-2" />New Assignment</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New assignment</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Subject</Label><Input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></div>
                <div><Label>Class</Label>
                  <Select value={form.class_id} onValueChange={(v) => setForm({ ...form, class_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.code} · {c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Due date</Label><Input type="datetime-local" value={form.due_at} onChange={e => setForm({ ...form, due_at: e.target.value })} /></div>
                <div><Label>Max score</Label><Input type="number" value={form.max_score} onChange={e => setForm({ ...form, max_score: Number(e.target.value) })} /></div>
              </div>
              <div><Label>Instructions</Label><Textarea rows={5} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={create} disabled={busy}>{busy && <Loader2 className="size-4 mr-2 animate-spin" />}Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }>
      {rows.length === 0 ? <EmptyState icon={ClipboardList} title="No assignments yet" desc="Create your first assignment to get started." /> :
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map(a => {
            const overdue = a.due_at && new Date(a.due_at) < new Date();
            return (
              <div key={a.id} className="rounded-xl border border-border p-4 bg-card flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold">{a.title}</div>
                  <Badge variant={overdue ? "destructive" : "secondary"} className="text-[10px]">{overdue ? "Overdue" : "Open"}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{a.subject || "—"} · Max {a.max_score}</div>
                {a.due_at && <div className="text-xs text-muted-foreground">Due {new Date(a.due_at).toLocaleString()}</div>}
                {a.description && <p className="text-xs mt-2 line-clamp-3 text-muted-foreground">{a.description}</p>}
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openView(a)}><Eye className="size-3.5 mr-1" />Submissions</Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(a.id)}>Delete</Button>
                </div>
              </div>
            );
          })}
        </div>}

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{view?.title} — Submissions ({graded}/{totalSubs} graded)</DialogTitle></DialogHeader>
          {subs.length === 0 ? <EmptyState icon={ClipboardList} title="No submissions yet" /> :
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {subs.map(s => <SubmissionRow key={s.id} sub={s} maxScore={view?.max_score} onGrade={grade} />)}
            </div>}
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

function SubmissionRow({ sub, maxScore, onGrade }: any) {
  const [score, setScore] = useState<string>(sub.score?.toString() ?? "");
  const [feedback, setFeedback] = useState<string>(sub.feedback ?? "");
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-muted-foreground">{sub.student_id.slice(0, 8)}</span>
        <span className="text-muted-foreground">{new Date(sub.submitted_at).toLocaleString()}</span>
        {sub.score != null ? <Badge className="bg-success/15 text-success"><CheckCircle2 className="size-3 mr-1" />Graded</Badge> : <Badge variant="secondary"><XCircle className="size-3 mr-1" />Pending</Badge>}
      </div>
      {sub.content && <p className="text-sm mt-2 whitespace-pre-wrap">{sub.content}</p>}
      <div className="mt-2 grid grid-cols-[100px_1fr_auto] gap-2 items-end">
        <div><Label className="text-[10px]">Score / {maxScore}</Label><Input type="number" value={score} onChange={e => setScore(e.target.value)} /></div>
        <div><Label className="text-[10px]">Feedback</Label><Input value={feedback} onChange={e => setFeedback(e.target.value)} /></div>
        <Button size="sm" onClick={() => onGrade(sub.id, Number(score), feedback)}>Save</Button>
      </div>
    </div>
  );
}