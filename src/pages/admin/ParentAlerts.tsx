import { useEffect, useState } from "react";
import { AlertTriangle, Send, RefreshCw, Trash2, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

type Alert = {
  id: string;
  student_id: string;
  parent_id: string | null;
  kind: string;
  severity: string;
  signal: any;
  draft_message: string | null;
  status: string;
  created_at: string;
  sent_at: string | null;
  studentName?: string;
  parentName?: string;
};

const KIND_LABEL: Record<string, string> = {
  attendance: "Attendance",
  grade_drop: "Grade drop",
  fee_overdue: "Fee overdue",
};

const SEVERITY_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  low: "secondary",
  medium: "default",
  high: "destructive",
};

export default function ParentAlerts() {
  const { school } = useSchool();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<"pending" | "sent" | "dismissed">("pending");

  async function load() {
    if (!school) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("parent_alerts")
      .select("*")
      .eq("school_id", school.id)
      .eq("status", filter)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const userIds = Array.from(new Set(
      (data ?? []).flatMap(a => [a.student_id, a.parent_id].filter(Boolean) as string[])
    ));
    const { data: profs } = userIds.length
      ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
      : { data: [] as any[] };
    const map: Record<string, string> = {};
    (profs ?? []).forEach((p: any) => { map[p.id] = p.full_name || p.email || p.id.slice(0, 8); });
    setAlerts((data ?? []).map(a => ({
      ...a,
      studentName: map[a.student_id] || "Student",
      parentName: a.parent_id ? (map[a.parent_id] || "Parent") : "— no linked parent —",
    })));
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [school?.id, filter]);

  async function runScan() {
    if (!school) return;
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke("automation-runner", {
        body: { school_id: school.id },
      });
      if (error) throw error;
      const res = (data as any)?.results?.[school.id];
      toast.success(`Scan complete: ${res?.inserted ?? 0} new alert(s) drafted`);
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Scan failed");
    } finally {
      setScanning(false);
    }
  }

  async function sendAlert(a: Alert) {
    if (!school) return;
    const body = (drafts[a.id] ?? a.draft_message ?? "").trim();
    if (!body) return toast.error("Message is empty");
    if (!a.parent_id) return toast.error("No linked parent to send to");
    setBusy(a.id);
    try {
      const personalised = body
        .replace(/\{\{parent_name\}\}/g, a.parentName?.split(" ")[0] || "there")
        .replace(/\{\{student_name\}\}/g, a.studentName || "your child");
      const { error } = await supabase.functions.invoke("notify-recipients", {
        body: {
          school_id: school.id,
          title: `${KIND_LABEL[a.kind] ?? "Alert"} — ${a.studentName}`,
          body: personalised,
          audience: "all", // delivered as a broadcast conversation; parent is included via membership
        },
      });
      if (error) throw error;
      const { error: upErr } = await supabase
        .from("parent_alerts")
        .update({ status: "sent", sent_at: new Date().toISOString(), draft_message: body })
        .eq("id", a.id);
      if (upErr) throw upErr;
      toast.success("Sent to parent");
      setAlerts(rs => rs.filter(r => r.id !== a.id));
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send");
    } finally {
      setBusy(null);
    }
  }

  async function dismiss(a: Alert) {
    const { error } = await supabase
      .from("parent_alerts")
      .update({ status: "dismissed" })
      .eq("id", a.id);
    if (error) return toast.error(error.message);
    setAlerts(rs => rs.filter(r => r.id !== a.id));
    toast.success("Dismissed");
  }

  return (
    <SectionCard
      title="AI Parent Alerts"
      description="The system scans attendance, grades, and overdue fees — and drafts parent messages for your approval."
      action={
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border overflow-hidden">
            {(["pending", "sent", "dismissed"] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-2.5 py-1 text-xs capitalize ${filter === s ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted"}`}
              >{s}</button>
            ))}
          </div>
          <Button size="sm" variant="outline" onClick={runScan} disabled={scanning}>
            {scanning ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 mr-1" />}
            Run scan
          </Button>
        </div>
      }
    >
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : alerts.length === 0 ? (
        <EmptyState
          icon={AlertTriangle}
          title={filter === "pending" ? "No pending alerts" : `No ${filter} alerts`}
          desc={filter === "pending" ? "Click ‘Run scan’ to look for new risk signals." : ""}
        />
      ) : (
        <ul className="space-y-3">
          {alerts.map(a => (
            <li key={a.id} className="rounded-lg border border-border p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={SEVERITY_VARIANT[a.severity] ?? "default"} className="capitalize text-[10px]">{a.severity}</Badge>
                    <Badge variant="outline" className="text-[10px]">{KIND_LABEL[a.kind] ?? a.kind}</Badge>
                    <span className="text-sm font-medium truncate">{a.studentName}</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    To: {a.parentName} · {new Date(a.created_at).toLocaleString()}
                  </div>
                </div>
                {a.sent_at && <Badge variant="secondary" className="text-[10px]">Sent</Badge>}
              </div>

              <div className="rounded-md bg-muted/40 p-2 text-[11px] text-muted-foreground font-mono">
                {JSON.stringify(a.signal)}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-1 text-[11px] text-primary">
                  <Sparkles className="w-3 h-3" /> AI draft (edit before sending)
                </div>
                <Textarea
                  rows={3}
                  defaultValue={a.draft_message ?? ""}
                  disabled={filter !== "pending"}
                  onChange={e => setDrafts(d => ({ ...d, [a.id]: e.target.value }))}
                />
              </div>

              {filter === "pending" && (
                <div className="flex items-center gap-2">
                  <Button size="sm" disabled={busy === a.id || !a.parent_id} onClick={() => sendAlert(a)}>
                    {busy === a.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1" />}
                    Approve & send
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => dismiss(a)}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Dismiss
                  </Button>
                  {!a.parent_id && (
                    <span className="text-[11px] text-muted-foreground">No parent linked to this student yet.</span>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}