import { useState } from "react";
import { Plus, Search, Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { students as initial } from "@/data/mock";
import { toast } from "sonner";

export default function AdminStudents() {
  const [list, setList] = useState(initial);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", class: "SS1 A", admission: "" });

  const filtered = list.filter(s => s.name.toLowerCase().includes(q.toLowerCase()) || s.admission.toLowerCase().includes(q.toLowerCase()));

  const submit = () => {
    if (!form.name || !form.admission) { toast.error("Please fill all required fields"); return; }
    setList(l => [...l, { id: l.length + 1, status: "Active", ...form }]);
    toast.success("Student added successfully");
    setOpen(false);
    setForm({ name: "", class: "SS1 A", admission: "" });
  };

  return (
    <SectionCard
      title="All Students"
      description={`${list.length} students enrolled`}
      action={
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search students..." value={q} onChange={e => setQ(e.target.value)} className="pl-9 w-[220px] bg-secondary/60 border-transparent" />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="size-4 mr-1.5" /> Add Student</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add new student</DialogTitle>
                <DialogDescription>Enter the student's details below.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div><Label>Full name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Jane Doe" /></div>
                <div><Label>Admission No.</Label><Input value={form.admission} onChange={e => setForm({...form, admission: e.target.value})} placeholder="ADM2025010" /></div>
                <div>
                  <Label>Class</Label>
                  <Select value={form.class} onValueChange={v => setForm({...form, class: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["JSS 1 A","JSS 2 A","JSS 3 A","SS1 A","SS2 A","SS3 A"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={submit}>Save student</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      }
    >
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
              <th className="text-left font-medium py-3 pr-4">ID</th>
              <th className="text-left font-medium py-3 pr-4">Name</th>
              <th className="text-left font-medium py-3 pr-4">Class</th>
              <th className="text-left font-medium py-3 pr-4">Admission No.</th>
              <th className="text-left font-medium py-3 pr-4">Status</th>
              <th className="text-left font-medium py-3 pr-4">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                <td className="py-3 pr-4">{s.id}</td>
                <td className="py-3 pr-4 font-medium">{s.name}</td>
                <td className="py-3 pr-4">{s.class}</td>
                <td className="py-3 pr-4 text-muted-foreground">{s.admission}</td>
                <td className="py-3 pr-4">
                  <Badge variant="outline" className={s.status === "Active" ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive"}>{s.status}</Badge>
                </td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="size-8 text-info"><Eye className="size-4" /></Button>
                    <Button variant="ghost" size="icon" className="size-8 text-warning"><Pencil className="size-4" /></Button>
                    <Button variant="ghost" size="icon" className="size-8 text-destructive" onClick={() => { setList(l => l.filter(x => x.id !== s.id)); toast.success("Student removed"); }}><Trash2 className="size-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="py-12 text-center text-muted-foreground">No students match your search.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
