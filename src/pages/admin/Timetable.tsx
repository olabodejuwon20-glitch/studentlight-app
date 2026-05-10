import { useEffect, useState } from "react";
import { Calendar, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

const DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function AdminTimetable() {
  const { school } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ class_id: "", day_of_week: 1, start_time: "08:00", end_time: "09:00", subject: "", room: "" });

  async function load() {
    if (!school) return;
    const [{ data: tt }, { data: cls }] = await Promise.all([
      supabase.from("timetable").select("*").eq("school_id", school.id).order("day_of_week").order("start_time"),
      supabase.from("classes").select("id,name,code").eq("school_id", school.id).order("name"),
    ]);
    setRows(tt ?? []); setClasses(cls ?? []);
  }
  useEffect(() => { load(); }, [school]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!school) return;
    const { error } = await supabase.from("timetable").insert({ ...form, school_id: school.id });
    if (error) return toast.error(error.message);
    toast.success("Slot added"); setOpen(false); load();
  }
  async function remove(id: string) {
    await supabase.from("timetable").delete().eq("id", id); load();
  }

  return (
    <SectionCard title="Weekly timetable" action={
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><Button size="sm" disabled={classes.length === 0}><Plus className="size-4 mr-1" /> Add slot</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Add timetable slot</DialogTitle></DialogHeader>
          <form onSubmit={add} className="space-y-3">
            <div><Label>Class</Label>
              <Select value={form.class_id} onValueChange={v => setForm({ ...form, class_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>{classes.map(c => <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Day</Label>
                <Select value={String(form.day_of_week)} onValueChange={v => setForm({ ...form, day_of_week: +v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DAYS.slice(1).map((d, i) => <SelectItem key={d} value={String(i+1)}>{d}</SelectItem>)}</SelectContent>
                </Select></div>
              <div><Label>Start</Label><Input type="time" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} /></div>
              <div><Label>End</Label><Input type="time" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} /></div>
            </div>
            <div><Label>Subject</Label><Input required value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></div>
            <div><Label>Room</Label><Input value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} /></div>
            <Button type="submit" className="w-full" disabled={!form.class_id}>Save</Button>
          </form>
        </DialogContent>
      </Dialog>
    }>
      {rows.length === 0
        ? <EmptyState icon={Calendar} title="No timetable yet" desc={classes.length === 0 ? "Create a class first." : "Add slots to build the weekly schedule."} />
        : <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground"><tr className="border-b border-border">
              <th className="text-left py-2">Day</th><th className="text-left">Time</th><th className="text-left">Subject</th>
              <th className="text-left">Room</th><th></th></tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="py-3 font-medium">{DAYS[r.day_of_week]}</td>
                <td className="tabular-nums text-muted-foreground">{r.start_time?.slice(0,5)} – {r.end_time?.slice(0,5)}</td>
                <td>{r.subject}</td>
                <td className="text-muted-foreground">{r.room || "—"}</td>
                <td className="text-right"><Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="size-4 text-destructive" /></Button></td>
              </tr>
            ))}</tbody>
          </table></div>}
    </SectionCard>
  );
}
