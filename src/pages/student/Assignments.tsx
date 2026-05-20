import { useEffect, useState } from "react";
import { ClipboardList, Loader2, CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function StudentAssignments() {
  const { school, user } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  const [subs, setSubs] = useState<Record<string, any>>({});
  const [active, setActive] = useState<any | null>(null);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!school || !user) return;
    const { data: cls } = await supabase.from("class_enrollments").select("class_id").eq("student_id", user.id);
    const cids = cls?.map(c => c.class_id) ?? [];
    const q = supabase.from("assignments").select("*").eq("school_id", school.id).order("due_at", { ascending: true });
    const { data: a } = cids.length ? await q.or(`class_id.is.null,class_id.in.(${cids.join(",")})`) : await q.is("class_id", null);
    setRows(a ?? []);
    const ids = (a ?? []).map(x => x.id);
    if (ids.length) {
      const { data: s } = await supabase.from("assignment_submissions").select("*").eq("student_id", user.id).in("assignment_id", ids);
      const map: Record<string, any> = {}; s?.forEach(x => map[x.assignment_id] = x);
      setSubs(map);
    }
  };
  useEffect(() => { load(); }, [school, user]);

  async function submit() {
    if (!active || !school || !user || !body.trim()) return;
    setBusy(true);
    const existing = subs[active.id];
    const payload = { assignment_id: active.id, school_id: school.id, student_id: user.id, content: body.trim(), submitted_at: new Date().toISOString() };
    const { error } = existing
      ? await supabase.from("assignment_submissions").update(payload).eq("id", existing.id)
      : await supabase.from("assignment_submissions").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Submitted"); setActive(null); setBody(""); await load();
  }

  return (
    <SectionCard title="My Assignments" description="Submit homework before the due date">
      {rows.length === 0 ? <EmptyState icon={ClipboardList} title="No assignments" /> :
        <div className="grid sm:grid-cols-2 gap-3">
          {rows.map(a => {
            const sub = subs[a.id];
            const overdue = a.due_at && new Date(a.due_at) < new Date() && !sub;
            return (
              <div key={a.id} className="rounded-xl border border-border p-4 bg-card">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold">{a.title}</div>
                  {sub?.score != null ? <Badge className="bg-success/15 text-success"><CheckCircle2 className="size-3 mr-1" />{sub.score}/{a.max_score}</Badge>
                    : sub ? <Badge variant="secondary"><Clock className="size-3 mr-1" />Submitted</Badge>
                    : overdue ? <Badge variant="destructive">Overdue</Badge> : <Badge variant="outline">Open</Badge>}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{a.subject || "—"}{a.due_at ? ` · Due ${new Date(a.due_at).toLocaleString()}` : ""}</div>
                {a.description && <p className="text-xs mt-2 line-clamp-3 text-muted-foreground">{a.description}</p>}
                {sub?.feedback && <p className="text-xs mt-2 italic text-muted-foreground">Feedback: {sub.feedback}</p>}
                <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => { setActive(a); setBody(sub?.content ?? ""); }}>{sub ? "Resubmit" : "Submit"}</Button>
              </div>
            );
          })}
        </div>}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{active?.title}</DialogTitle></DialogHeader>
          <Textarea rows={8} value={body} onChange={e => setBody(e.target.value)} placeholder="Type your response or paste a link…" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>Cancel</Button>
            <Button onClick={submit} disabled={busy}>{busy && <Loader2 className="size-4 mr-2 animate-spin" />}Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}