import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, Section, StatusBadge, Skel, EmptyState } from "@/components/super/primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { superAction } from "@/lib/super";
import { timeAgo } from "@/lib/super";

type Row = { id: string; title: string; body: string; audience: string; priority: string; scheduled_for: string | null; created_at: string };

export default function SuperAnnouncements() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", audience: "all", priority: "normal", scheduled_for: "" });
  const [busy, setBusy] = useState(false);

  async function load() {
    setRows(null);
    const { data } = await supabase.from("platform_announcements").select("*").order("created_at", { ascending: false }).limit(200);
    setRows((data as Row[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function publish() {
    if (!form.title.trim() || !form.body.trim()) { toast.error("Title and body required"); return; }
    setBusy(true);
    try {
      await superAction("broadcast_announcement", {
        title: form.title, body: form.body, priority: form.priority, audience: form.audience,
        scheduled_for: form.scheduled_for ? new Date(form.scheduled_for).toISOString() : null,
      });
      toast.success("Announcement published");
      setOpen(false); setForm({ title: "", body: "", audience: "all", priority: "normal", scheduled_for: "" });
      load();
    } catch {/* toasted */} finally { setBusy(false); }
  }

  async function remove(id: string) {
    try { await superAction("delete_announcement", { id }); toast.success("Deleted"); load(); }
    catch {/* toasted */}
  }

  return (
    <div>
      <PageHeader title="Platform Announcements" description="Broadcast across every tenant. Target by audience and priority."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="size-3.5 mr-1.5" />New announcement</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Broadcast announcement</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>Title</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Body</Label><Textarea rows={5} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Audience</Label>
                    <Select value={form.audience} onValueChange={v => setForm({ ...form, audience: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All users</SelectItem>
                        <SelectItem value="admins">School admins</SelectItem>
                        <SelectItem value="teachers">Teachers</SelectItem>
                        <SelectItem value="students">Students</SelectItem>
                        <SelectItem value="parents">Parents</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Scheduled for (optional)</Label>
                  <Input type="datetime-local" value={form.scheduled_for} onChange={e => setForm({ ...form, scheduled_for: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={publish} disabled={busy}>Publish</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />
      <Section title="Recent broadcasts">
        {rows === null ? (
          <div className="space-y-2">{Array.from({length:4}).map((_,i)=><Skel key={i} className="h-16" />)}</div>
        ) : rows.length === 0 ? (
          <EmptyState icon={<Megaphone className="size-5 text-muted-foreground" />} title="Nothing broadcast yet"
            description="Click ‘New announcement’ to push the first message." />
        ) : (
          <ul className="divide-y divide-border -my-2">
            {rows.map(r => (
              <li key={r.id} className="py-3 flex items-start gap-3">
                <div className="size-9 rounded-md bg-muted grid place-items-center"><Megaphone className="size-4 text-muted-foreground" /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{r.title}</span>
                    <StatusBadge status={r.priority} />
                    <span className="text-[11px] text-muted-foreground capitalize">{r.audience}</span>
                    {r.scheduled_for && new Date(r.scheduled_for) > new Date() && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-info/10 text-info">Scheduled {new Date(r.scheduled_for).toLocaleString()}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.body}</p>
                  <div className="text-[10px] text-muted-foreground mt-1">{timeAgo(r.created_at)}</div>
                </div>
                <Button size="icon" variant="ghost" className="size-7" onClick={() => remove(r.id)} title="Delete"><Trash2 className="size-3.5" /></Button>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}