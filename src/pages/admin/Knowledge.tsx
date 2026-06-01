import { useEffect, useState } from "react";
import { BookOpen, Upload, Loader2, RefreshCw, FileText, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

type Doc = {
  id: string; title: string; status: string; chunk_count: number;
  visibility: string; subject_code: string | null; curriculum: string | null;
  source_path: string | null; error: string | null; created_at: string;
};

export default function Knowledge() {
  const { school } = useSchool();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState("school");

  async function load() {
    if (!school) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("knowledge_documents")
      .select("*")
      .eq("school_id", school.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setDocs((data ?? []) as Doc[]);
    setLoading(false);
  }
  useEffect(() => { load(); }, [school?.id]);

  async function addText() {
    if (!school || !title.trim() || !text.trim()) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ingest-knowledge", {
        body: { school_id: school.id, title: title.trim(), text: text.trim(), visibility, mime_type: "text/plain" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Ingested ${data.chunks} chunks`);
      setTitle(""); setText(""); load();
    } catch (e: any) {
      toast.error(e?.message ?? "Ingestion failed");
    } finally { setBusy(false); }
  }

  async function reingest(id: string) {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("ingest-knowledge", { body: { document_id: id } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Re-indexed");
      load();
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    finally { setBusy(false); }
  }

  async function remove(id: string) {
    if (!confirm("Delete this document and its chunks?")) return;
    const { error } = await supabase.from("knowledge_documents").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); load(); }
  }

  return (
    <div className="space-y-4">
      <SectionCard title="Add knowledge" description="Paste text (policies, lesson notes, curriculum). PDF/DOCX parsing coming next.">
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <Input placeholder="Title (e.g. Staff Handbook 2026)" value={title} onChange={e => setTitle(e.target.value)} />
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="school">Whole school</SelectItem>
                <SelectItem value="public_curriculum">Public curriculum</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea placeholder="Paste content here…" rows={8} value={text} onChange={e => setText(e.target.value)} />
          <div className="flex justify-end">
            <Button onClick={addText} disabled={busy || !title.trim() || !text.trim()}>
              {busy ? <Loader2 className="size-4 animate-spin mr-2" /> : <Upload className="size-4 mr-2" />}
              Ingest
            </Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Knowledge base"
        description={`${docs.length} documents`}
        action={<Button size="sm" variant="outline" onClick={load} disabled={loading}><RefreshCw className={`size-4 mr-2 ${loading ? "animate-spin" : ""}`} /> Refresh</Button>}
      >
        {loading ? <div className="py-6 text-center text-muted-foreground"><Loader2 className="size-5 animate-spin inline" /></div>
          : docs.length === 0 ? <EmptyState icon={BookOpen} title="No documents yet" desc="Add a document above or upload to the library." />
          : (
            <ul className="divide-y divide-border">
              {docs.map(d => (
                <li key={d.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-3">
                    <FileText className="size-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium truncate">{d.title}</div>
                      <div className="text-xs text-muted-foreground flex gap-2 items-center">
                        <Badge variant={d.status === "ready" ? "secondary" : d.status === "error" ? "destructive" : "outline"}>{d.status}</Badge>
                        <span>{d.chunk_count} chunks</span>
                        <span>· {d.visibility}</span>
                        {d.error && <span className="text-destructive truncate">— {d.error}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => reingest(d.id)} disabled={busy}><RefreshCw className="size-3.5" /></Button>
                    <Button size="sm" variant="outline" onClick={() => remove(d.id)}><Trash2 className="size-3.5" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </SectionCard>
    </div>
  );
}