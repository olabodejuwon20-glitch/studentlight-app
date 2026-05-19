import { useEffect, useMemo, useState } from "react";
import { BookOpen, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Note = {
  id: string; title: string; subject: string | null; grade_level: string | null;
  topic: string | null; duration_min: number | null; content: string; created_at: string;
};

export default function StudentLessonNotes() {
  const { school } = useSchool();
  const [rows, setRows] = useState<Note[]>([]);
  const [q, setQ] = useState("");
  const [subject, setSubject] = useState<string>("all");
  const [topic, setTopic] = useState<string>("all");
  const [open, setOpen] = useState<Note | null>(null);

  useEffect(() => {
    if (!school) return;
    supabase.from("lesson_notes").select("*")
      .eq("school_id", school.id).eq("status", "approved")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows((data ?? []) as Note[]));
  }, [school]);

  const subjects = useMemo(() => Array.from(new Set(rows.map(r => r.subject).filter(Boolean))) as string[], [rows]);
  const topics = useMemo(() => Array.from(new Set(
    rows.filter(r => subject === "all" || r.subject === subject).map(r => r.topic).filter(Boolean)
  )) as string[], [rows, subject]);

  const filtered = rows.filter(r =>
    (subject === "all" || r.subject === subject) &&
    (topic === "all" || r.topic === topic) &&
    (!q || r.title.toLowerCase().includes(q.toLowerCase()) ||
      (r.topic || "").toLowerCase().includes(q.toLowerCase()) ||
      (r.subject || "").toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <SectionCard
      title="Lesson notes"
      description="Approved lesson notes shared by your teachers."
      action={
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" className="pl-9 h-9 w-44" />
          </div>
          <Select value={subject} onValueChange={v => { setSubject(v); setTopic("all"); }}>
            <SelectTrigger className="h-9 w-36"><SelectValue placeholder="Subject" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjects.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={topic} onValueChange={setTopic}>
            <SelectTrigger className="h-9 w-40"><SelectValue placeholder="Topic" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All topics</SelectItem>
              {topics.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      }
    >
      {filtered.length === 0 ? (
        <EmptyState icon={BookOpen} title="No lesson notes yet" desc="Approved notes from teachers will appear here." />
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(n => (
            <li key={n.id}>
              <button onClick={() => setOpen(n)} className="w-full text-left rounded-lg border border-border bg-card p-4 hover:border-primary/40 transition">
                <div className="flex items-start gap-3">
                  <div className="size-9 rounded-lg bg-primary/10 grid place-items-center shrink-0">
                    <BookOpen className="size-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{n.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {[n.subject, n.grade_level, n.topic].filter(Boolean).join(" · ") || "General"}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{open?.title}</DialogTitle></DialogHeader>
          <div className="text-xs text-muted-foreground">
            {[open?.subject, open?.grade_level, open?.topic].filter(Boolean).join(" · ")}
          </div>
          <pre className="whitespace-pre-wrap text-sm font-sans mt-3 border border-border rounded-md p-4 bg-secondary/30">{open?.content}</pre>
          <div className="flex justify-end"><Button variant="outline" onClick={() => setOpen(null)}>Close</Button></div>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
