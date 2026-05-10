import { useEffect, useState } from "react";
import { Bus, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function AdminTransport() {
  const { school } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", driver: "", vehicle_no: "", capacity: 0, fee: 0 });

  async function load() {
    if (!school) return;
    const { data } = await supabase.from("transport_routes").select("*").eq("school_id", school.id).order("name");
    setRows(data ?? []);
  }
  useEffect(() => { load(); }, [school]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!school) return;
    const { error } = await supabase.from("transport_routes").insert({ ...form, school_id: school.id });
    if (error) return toast.error(error.message);
    toast.success("Route added"); setOpen(false); setForm({ name: "", driver: "", vehicle_no: "", capacity: 0, fee: 0 }); load();
  }
  async function remove(id: string) {
    const { error } = await supabase.from("transport_routes").delete().eq("id", id);
    if (error) return toast.error(error.message); load();
  }

  return (
    <SectionCard title="Transport routes" action={
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-1" /> Add route</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Add route</DialogTitle></DialogHeader>
          <form onSubmit={add} className="space-y-3">
            <div><Label>Route name</Label><Input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Driver</Label><Input value={form.driver} onChange={e => setForm({ ...form, driver: e.target.value })} /></div>
              <div><Label>Vehicle no.</Label><Input value={form.vehicle_no} onChange={e => setForm({ ...form, vehicle_no: e.target.value })} /></div>
              <div><Label>Capacity</Label><Input type="number" min={0} value={form.capacity} onChange={e => setForm({ ...form, capacity: +e.target.value })} /></div>
              <div><Label>Fee</Label><Input type="number" min={0} value={form.fee} onChange={e => setForm({ ...form, fee: +e.target.value })} /></div>
            </div>
            <Button type="submit" className="w-full">Save</Button>
          </form>
        </DialogContent>
      </Dialog>
    }>
      {rows.length === 0
        ? <EmptyState icon={Bus} title="No routes yet" desc="Add a transport route to get started." />
        : <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground"><tr className="border-b border-border">
              <th className="text-left py-2">Route</th><th className="text-left">Driver</th><th className="text-left">Vehicle</th>
              <th className="text-right">Capacity</th><th className="text-right">Fee</th><th></th></tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="py-3 font-medium">{r.name}</td>
                <td className="text-muted-foreground">{r.driver || "—"}</td>
                <td className="text-muted-foreground">{r.vehicle_no || "—"}</td>
                <td className="text-right tabular-nums">{r.capacity}</td>
                <td className="text-right tabular-nums">{Number(r.fee).toLocaleString()}</td>
                <td className="text-right"><Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="size-4 text-destructive" /></Button></td>
              </tr>
            ))}</tbody>
          </table></div>}
    </SectionCard>
  );
}
