import { useEffect, useMemo, useState } from "react";
import { Sparkles, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type ResultRow = { student_id: string; subject: string; term?: string | null };

export function ReportCommentDialog({ schoolId, results }: { schoolId: string; results: ResultRow[] }) {
  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState<{ id: string; full_name: string | null }[]>([]);
  const [studentId, setStudentId] = useState("");
  const [subject, setSubject] = useState("");
  const [term, setTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState("");

  const subjects = useMemo(
    () => Array.from(new Set(results.map(r => r.subject))).sort(),
    [results],
  );
  const terms = useMemo(
    () => Array.from(new Set(results.map(r => r.term).filter(Boolean) as string[])).sort(),
    [results],
  );
  const studentIds = useMemo(
    () => Array.from(new Set(results.map(r => r.student_id))),
    [results],
  );

  useEffect(() => {
    if (!open || !studentIds.length) return;
    supabase.from("profiles").select("id,full_name").in("id", studentIds)
      .then(({ data }) => {
        const list = (data ?? []).sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
        setStudents(list);
        if (!studentId && list[0]) setStudentId(list[0].id);
      });
  }, [open, studentIds.join(",")]);

  async function generate() {
    if (!studentId) return toast.error("Select a student");
    setLoading(true);
    setComment("");
    try {
      const { data, error } = await supabase.functions.invoke("generate-report-comment", {
        body: { student_id: studentId, school_id: schoolId, subject: subject || null, term: term || null },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setComment((data as any)?.comment ?? "");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate comment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="default" className="gap-1.5">
          <Sparkles className="size-4" /> AI Comment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="size-4 text-primary" /> AI Report Comment</DialogTitle>
          <DialogDescription>Drafts a warm, factual end-of-term comment grounded in the student's actual results.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid gap-1.5">
            <Label>Student</Label>
            <select className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={studentId} onChange={e => setStudentId(e.target.value)}>
              {students.map(s => <option key={s.id} value={s.id}>{s.full_name || s.id.slice(0,8)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Subject (optional)</Label>
              <select className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={subject} onChange={e => setSubject(e.target.value)}>
                <option value="">All subjects</option>
                {subjects.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label>Term (optional)</Label>
              <select className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={term} onChange={e => setTerm(e.target.value)}>
                <option value="">All terms</option>
                {terms.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <Button onClick={generate} disabled={loading} className="w-full gap-1.5">
            {loading ? <><Loader2 className="size-4 animate-spin" /> Generating…</> : <><Sparkles className="size-4" /> Generate comment</>}
          </Button>
          {comment && (
            <div className="space-y-2">
              <Label>Suggested comment (edit before saving)</Label>
              <Textarea value={comment} onChange={e => setComment(e.target.value)} rows={5} className="resize-none" />
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(comment); toast.success("Copied"); }}>
                  <Copy className="size-4" /> Copy
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">AI-generated. Review before sharing with parents.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}