import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Plus, Calendar as CalendarIcon, ArrowLeft, AlertTriangle, ScrollText, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { schoolPath } from "@/lib/tenant";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { TradSession, TradTimetableRow, TradExam } from "@/lib/tradExams";
import { DRAFT_STATUS_TONE, formatStatus } from "@/lib/tradExams";

export default function AdminTradExamSession() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { school } = useSchool();
  const nav = useNavigate();
  const [session, setSession] = useState<TradSession | null>(null);
  const [rows, setRows] = useState<TradTimetableRow[]>([]);
  const [classes, setClasses] = useState<{ id: string; name: string; code: string | null }[]>([]);
  const [exams, setExams] = useState<TradExam[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    class_id: "",
    subject_name: "",
    exam_date: "",
    start_time: "09:00",
    duration_minutes: 60,
    venue: "",
  });

  async function load() {
    if (!school || !sessionId) return;
    const [s, r, c, ex] = await Promise.all([
      supabase.from("trad_exam_sessions" as any).select("*").eq("id", sessionId).maybeSingle(),
      supabase.from("trad_exam_timetable" as any).select("*").eq("session_id", sessionId)
        .order("exam_date").order("start_time"),
      supabase.from("classes").select("id,name,code").eq("school_id", school.id).order("name"),
      supabase.from("trad_exams" as any).select("*").eq("school_id", school.id),
    ]);
    setSession((s.data as any) ?? null);
    setRows(((r.data as any) ?? []) as TradTimetableRow[]);
    setClasses((c.data ?? []) as any);
    setExams(((ex.data as any) ?? []) as TradExam[]);
  }
  useEffect(() => { load(); }, [school?.id, sessionId]);

  const examByTimetable = useMemo(() => {
    const m = new Map<string, TradExam>();
    exams.forEach(e => { if (e.timetable_id) m.set(e.timetable_id, e); });
    return m;
  }, [exams]);

  const classMap = useMemo(() => {
    const m = new Map<string, { name: string; code: string | null }>();
    classes.forEach(c => m.set(c.id, c));
    return m;
  }, [classes]);

  // Group rows by date for the calendar-style display.
  const grouped = useMemo(() => {
    const map = new Map<string, TradTimetableRow[]>();
    rows.forEach(r => {
      const k = r.exam_date;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  async function addSlot(e: React.FormEvent) {
    e.preventDefault();
    if (!school || !sessionId) return;
    setBusy(true);
    const { error } = await supabase.from("trad_exam_timetable" as any).insert({
      school_id: school.id,
      session_id: sessionId,
      class_id: form.class_id,
      subject_name: form.subject_name || null,
      exam_date: form.exam_date,
      start_time: form.start_time,
      duration_minutes: Number(form.duration_minutes) || 60,
      venue: form.venue || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Slot added");
    setOpen(false);
    setForm({ ...form, subject_name: "", venue: "" });
    load();
  }

  async function createPaperFor(slot: TradTimetableRow) {
    if (!school) return;
    const klass = classMap.get(slot.class_id);
    const { data, error } = await supabase.from("trad_exams" as any).insert({
      school_id: school.id,
      timetable_id: slot.id,
      title: `${slot.subject_name ?? "Untitled"} — ${klass?.name ?? "Class"}`,
      total_marks: 100,
      exam_type: "mixed",
    }).select("id").maybeSingle();
    if (error) return toast.error(error.message);
    if ((data as any)?.id) nav(schoolPath(school.slug, `/app/admin/trad-exams/paper/${(data as any).id}`));
  }

  async function removeSlot(id: string) {
    if (!confirm("Remove this exam slot?")) return;
    const { error } = await supabase.from("trad_exam_timetable" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to={schoolPath(school?.slug, "/app/admin/trad-exams")}>
            <ArrowLeft className="size-4 mr-1" /> Back to sessions
          </Link>
        </Button>
      </div>

      <SectionCard
        title={session?.name ?? "Exam session"}
        description={session?.term && session?.academic_year ? `${session.term} · ${session.academic_year}` : "Loading…"}
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="size-4 mr-1.5" />Add exam slot</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Schedule a paper</DialogTitle></DialogHeader>
              <form onSubmit={addSlot} className="space-y-3">
                <div>
                  <Label>Class</Label>
                  <Select value={form.class_id} onValueChange={v => setForm({ ...form, class_id: v })}>
                    <SelectTrigger><SelectValue placeholder="Pick a class" /></SelectTrigger>
                    <SelectContent>
                      {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.code ? `${c.code} — ${c.name}` : c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Subject</Label>
                  <Input required value={form.subject_name} onChange={e => setForm({ ...form, subject_name: e.target.value })}
                    placeholder="Mathematics" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Date</Label>
                    <Input type="date" required value={form.exam_date} onChange={e => setForm({ ...form, exam_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>Time</Label>
                    <Input type="time" required value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
                  </div>
                  <div>
                    <Label>Duration (min)</Label>
                    <Input type="number" min={5} required value={form.duration_minutes}
                      onChange={e => setForm({ ...form, duration_minutes: Number(e.target.value) })} />
                  </div>
                </div>
                <div>
                  <Label>Venue (optional)</Label>
                  <Input value={form.venue} onChange={e => setForm({ ...form, venue: e.target.value })} placeholder="Main Hall" />
                </div>
                <DialogFooter><Button type="submit" disabled={busy || !form.class_id}>{busy ? "Saving…" : "Schedule"}</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      >
        {rows.length === 0 ? (
          <EmptyState icon={CalendarIcon} title="No exam slots yet"
            desc="Add the first exam slot — date, class, subject, and duration. We'll alert you about clashes." />
        ) : (
          <div className="space-y-6">
            {grouped.map(([date, slots]) => (
              <div key={date}>
                <div className="flex items-center gap-2 mb-3">
                  <CalendarIcon className="size-4 text-muted-foreground" />
                  <div className="font-display font-semibold">{new Date(date).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</div>
                  <Badge variant="secondary">{slots.length} paper{slots.length === 1 ? "" : "s"}</Badge>
                </div>
                <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                  {slots.map(slot => {
                    const paper = examByTimetable.get(slot.id);
                    const klass = classMap.get(slot.class_id);
                    const conflict = slots.some(other =>
                      other.id !== slot.id
                      && other.class_id === slot.class_id
                      && timesOverlap(slot, other)
                    );
                    return (
                      <div key={slot.id} className="rounded-xl bg-card border border-border p-4 shadow-card">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-display font-semibold truncate">{slot.subject_name ?? "Untitled subject"}</div>
                            <div className="text-xs text-muted-foreground mt-0.5 truncate">
                              {klass?.code ?? "Class"} — {klass?.name ?? slot.class_id}
                            </div>
                          </div>
                          {conflict && (
                            <Badge className="bg-red-500/15 text-red-700 dark:text-red-300" variant="outline">
                              <AlertTriangle className="size-3 mr-1" /> Conflict
                            </Badge>
                          )}
                        </div>
                        <div className="mt-3 text-sm">
                          {slot.start_time.slice(0, 5)} · {slot.duration_minutes} min
                          {slot.venue ? ` · ${slot.venue}` : ""}
                        </div>
                        <div className="mt-3 flex items-center gap-2 flex-wrap">
                          {paper ? (
                            <>
                              <Badge variant="outline" className={DRAFT_STATUS_TONE[paper.draft_status]}>
                                {formatStatus(paper.draft_status)}
                              </Badge>
                              <Button size="sm" variant="outline" asChild>
                                <Link to={schoolPath(school?.slug, `/app/admin/trad-exams/paper/${paper.id}`)}>
                                  <FileText className="size-3.5 mr-1" /> Open paper
                                </Link>
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" onClick={() => createPaperFor(slot)}>
                              <ScrollText className="size-3.5 mr-1" /> Create paper
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => removeSlot(slot.id)}>Remove</Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function timesOverlap(a: TradTimetableRow, b: TradTimetableRow) {
  const [ah, am] = a.start_time.split(":").map(Number);
  const [bh, bm] = b.start_time.split(":").map(Number);
  const aStart = ah * 60 + am;
  const bStart = bh * 60 + bm;
  return aStart < bStart + b.duration_minutes && bStart < aStart + a.duration_minutes;
}