import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ScrollText, Plus, Calendar as CalendarIcon, ChevronRight } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { TradSession } from "@/lib/tradExams";
import { formatStatus } from "@/lib/tradExams";

const STATUS_TONE: Record<string, string> = {
  planning: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  published: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  locked: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
};

export default function AdminTradExams() {
  const { school, user } = useSchool();
  const [rows, setRows] = useState<TradSession[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    term: "First Term",
    academic_year: new Date().getFullYear() + "/" + (new Date().getFullYear() + 1),
    start_date: "",
    end_date: "",
  });

  async function load() {
    if (!school) return;
    const { data, error } = await supabase
      .from("trad_exam_sessions" as any)
      .select("*")
      .eq("school_id", school.id)
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); return; }
    setRows((data ?? []) as any);
  }

  useEffect(() => { load(); }, [school?.id]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!school || !user) return;
    setBusy(true);
    const { error } = await supabase.from("trad_exam_sessions" as any).insert({
      school_id: school.id,
      name: form.name,
      term: form.term || null,
      academic_year: form.academic_year || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      created_by: user.id,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Exam session created");
    setOpen(false);
    setForm({ name: "", term: "First Term", academic_year: form.academic_year, start_date: "", end_date: "" });
    load();
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Traditional Exams"
        description="Plan exam periods, build the timetable, and assemble exam papers."
        action={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="size-4 mr-1.5" />New exam session</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Create exam session</DialogTitle></DialogHeader>
              <form onSubmit={create} className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="2026 First Term Examinations" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Term</Label>
                    <Input value={form.term} onChange={e => setForm({ ...form, term: e.target.value })} />
                  </div>
                  <div>
                    <Label>Academic year</Label>
                    <Input value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start date</Label>
                    <Input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} />
                  </div>
                  <div>
                    <Label>End date</Label>
                    <Input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} />
                  </div>
                </div>
                <DialogFooter><Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create"}</Button></DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      >
        {rows.length === 0 ? (
          <EmptyState icon={ScrollText} title="No exam sessions yet"
            desc="Create your first exam session to start scheduling subjects and assigning papers to teachers." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map(s => (
              <Link key={s.id} to={schoolPath(school?.slug, `/app/admin/trad-exams/${s.id}`)}
                className="group rounded-xl bg-card border border-border p-5 shadow-card hover:border-primary/40 transition">
                <div className="flex items-start justify-between">
                  <div className="size-10 rounded-lg bg-primary/10 grid place-items-center text-primary">
                    <ScrollText className="size-5" />
                  </div>
                  <Badge variant="outline" className={STATUS_TONE[s.status]}>{formatStatus(s.status)}</Badge>
                </div>
                <div className="mt-4 font-display font-semibold leading-tight">{s.name}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {s.term ? `${s.term} · ` : ""}{s.academic_year ?? "—"}
                </div>
                {(s.start_date || s.end_date) && (
                  <div className="mt-3 text-xs flex items-center gap-1.5 text-muted-foreground">
                    <CalendarIcon className="size-3.5" />
                    {s.start_date ?? "?"} → {s.end_date ?? "?"}
                  </div>
                )}
                <div className="mt-4 flex items-center gap-1 text-xs text-primary opacity-0 group-hover:opacity-100 transition">
                  Open timetable <ChevronRight className="size-3.5" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}