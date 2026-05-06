import { useEffect, useState } from "react";
import { Plus, Copy, Ticket, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool, Role } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const ROLES: Role[] = ["admin", "teacher", "student", "parent"];
const rand = () => Math.random().toString(36).slice(2, 8).toUpperCase();

export default function AdminInvites() {
  const { school, user } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>("student");
  const [maxUses, setMaxUses] = useState(50);

  async function load() {
    if (!school) return;
    const { data } = await supabase.from("invite_codes").select("*").eq("school_id", school.id).order("created_at", { ascending: false });
    setRows(data ?? []);
  }
  useEffect(() => { load(); }, [school]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!school || !user) return;
    const code = `${school.slug.toUpperCase().slice(0,5)}-${role.toUpperCase().slice(0,3)}-${rand()}`;
    const { error } = await supabase.from("invite_codes").insert({ school_id: school.id, code, role, max_uses: maxUses, created_by: user.id });
    if (error) return toast.error(error.message);
    toast.success("Code generated"); setOpen(false); load();
  }

  async function remove(id: string) {
    const { error } = await supabase.from("invite_codes").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  }

  return (
    <SectionCard title="Invite codes" description="Share these with people to let them join your school"
      action={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="size-4 mr-1.5" />Generate code</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Generate invite</DialogTitle></DialogHeader>
            <form onSubmit={create} className="space-y-3">
              <div><Label>Role</Label>
                <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Max uses</Label><Input type="number" min={1} value={maxUses} onChange={e => setMaxUses(Number(e.target.value))} /></div>
              <DialogFooter><Button type="submit">Generate</Button></DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }>
      {rows.length === 0
        ? <EmptyState icon={Ticket} title="No codes yet" desc="Generate one to invite teachers, students or parents." />
        : <div className="space-y-2">
            {rows.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <code className="px-3 py-1.5 rounded-md bg-secondary font-mono text-sm">{r.code}</code>
                <Badge variant="outline" className="capitalize">{r.role}</Badge>
                <span className="text-xs text-muted-foreground">{r.uses}/{r.max_uses} uses</span>
                <div className="ml-auto flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(r.code); toast.success("Copied"); }}><Copy className="size-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="size-4 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>}
    </SectionCard>
  );
}
