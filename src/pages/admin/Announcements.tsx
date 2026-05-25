import { useEffect, useState } from "react";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export default function AdminAnnouncements() {
  const { school, user } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "" });
  const [broadcast, setBroadcast] = useState(true);
  const [audience, setAudience] = useState<"all" | "teacher" | "student" | "parent">("all");

  async function load() {
    if (!school) return;
    const { data } = await supabase.from("announcements").select("*").eq("school_id", school.id).order("created_at", { ascending: false });
    setRows(data ?? []);
  }
  useEffect(() => { load(); }, [school]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!school || !user) return;
    const { error } = await supabase.from("announcements").insert({ ...form, school_id: school.id, created_by: user.id });
    if (error) return toast.error(error.message);
    if (broadcast) {
      const { error: fnErr } = await supabase.functions.invoke("notify-recipients", {
        body: { school_id: school.id, title: form.title, body: form.body, audience },
      });
      if (fnErr) toast.error(`Broadcast failed: ${fnErr.message}`);
      else toast.success("Announcement posted & broadcast to inboxes");
    } else {
      toast.success("Announcement posted");
    }
    setOpen(false); setForm({ title: "", body: "" }); load();
  }
  async function remove(id: string) { await supabase.from("announcements").delete().eq("id", id); load(); }

  return (
    <SectionCard title="Announcements" action={
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild><Button size="sm"><Plus className="size-4 mr-1" /> New</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>New announcement</DialogTitle></DialogHeader>
          <form onSubmit={add} className="space-y-3">
            <div><Label>Title</Label><Input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
            <div><Label>Message</Label><Textarea rows={4} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} /></div>
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <div className="text-sm font-medium">Also deliver to inboxes</div>
                <div className="text-xs text-muted-foreground">Creates a broadcast conversation everyone in the audience can see in their inbox.</div>
              </div>
              <Switch checked={broadcast} onCheckedChange={setBroadcast} />
            </div>
            {broadcast && (
              <div>
                <Label>Audience</Label>
                <div className="flex gap-2 flex-wrap mt-1">
                  {(["all","teacher","student","parent"] as const).map(a => (
                    <button type="button" key={a} onClick={() => setAudience(a)}
                      className={`text-xs px-3 py-1.5 rounded-full border capitalize ${audience===a ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>{a}</button>
                  ))}
                </div>
              </div>
            )}
            <Button type="submit" className="w-full">Publish</Button>
          </form>
        </DialogContent>
      </Dialog>
    }>
      {rows.length === 0
        ? <EmptyState icon={Megaphone} title="No announcements yet" desc="Post your first announcement to reach the whole school." />
        : <ul className="divide-y divide-border">{rows.map(r => (
            <li key={r.id} className="py-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-medium">{r.title}</div>
                {r.body && <div className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{r.body}</div>}
                <div className="text-[11px] text-muted-foreground mt-1">{new Date(r.created_at).toLocaleString()}</div>
              </div>
              <Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="size-4 text-destructive" /></Button>
            </li>
          ))}</ul>}
    </SectionCard>
  );
}
