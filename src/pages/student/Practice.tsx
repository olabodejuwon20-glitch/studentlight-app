import { useEffect, useState } from "react";
import { BookOpenCheck, FileText, Upload, Search, Sparkles, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function Practice() {
  const { school, user } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(false);

  async function refresh() {
    if (!school) return;
    const { data } = await supabase.from("library_files").select("*").eq("school_id", school.id).order("created_at", { ascending: false });
    setRows(data ?? []);
  }
  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [school?.id]);

  async function open(r: any) {
    const { data } = await supabase.storage.from("library").createSignedUrl(r.storage_path, 60 * 10);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function uploadOwn(file: File) {
    if (!school || !user) return;
    setUploading(true);
    try {
      const path = `${school.id}/student-uploads/${user.id}/${Date.now()}-${file.name}`;
      const { error: e1 } = await supabase.storage.from("library").upload(path, file);
      if (e1) throw e1;
      // Student can't insert into library_files (RLS limits to teacher/admin) — store metadata client-side instead
      // We just open the file directly after upload as a one-off practice resource.
      const { data } = await supabase.storage.from("library").createSignedUrl(path, 60 * 10);
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
      toast.success("Uploaded — opening in a new tab");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const own = rows.filter(r => r.uploaded_by === user?.id);
  const school_resources = rows.filter(r => r.uploaded_by !== user?.id);
  const filterFn = (arr: any[]) => arr.filter(r => !q || r.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Practice Mode"
        description="Study with resources from your school library or your own uploads. No timer, no score — just learn."
      />

      <SectionCard
        title="Practice resources"
        description="Open any file to start studying. PDFs, slides and images open in a new tab."
        action={
          <div className="flex items-center gap-2">
            <div className="relative w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search" className="pl-9 h-9" />
            </div>
            <label className="cursor-pointer">
              <input type="file" hidden disabled={uploading}
                onChange={e => e.target.files?.[0] && uploadOwn(e.target.files[0])} />
              <Button asChild size="sm" variant="outline" disabled={uploading}>
                <span><Upload className="size-4 mr-1.5" /> {uploading ? "Uploading..." : "Upload my own"}</span>
              </Button>
            </label>
          </div>
        }
      >
        <Tabs defaultValue="school">
          <TabsList>
            <TabsTrigger value="school"><BookOpenCheck className="size-3.5 mr-1.5" /> School Library ({school_resources.length})</TabsTrigger>
            <TabsTrigger value="mine"><Sparkles className="size-3.5 mr-1.5" /> My Uploads ({own.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="school" className="mt-3">
            <FileList items={filterFn(school_resources)} onOpen={open} emptyLabel="No school resources yet" />
          </TabsContent>
          <TabsContent value="mine" className="mt-3">
            <FileList items={filterFn(own)} onOpen={open} emptyLabel="Upload a PDF, image or doc to start practicing." />
          </TabsContent>
        </Tabs>
      </SectionCard>
    </div>
  );
}

function FileList({ items, onOpen, emptyLabel }: { items: any[]; onOpen: (r: any) => void; emptyLabel: string }) {
  if (!items.length) return <EmptyState icon={FileText} title="Nothing here" desc={emptyLabel} />;
  return (
    <ul className="divide-y divide-border">
      {items.map(f => (
        <li key={f.id} className="py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="size-10 rounded-lg bg-primary/10 grid place-items-center shrink-0"><FileText className="size-5 text-primary" /></div>
            <div className="min-w-0">
              <div className="font-medium truncate">{f.name}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                {f.category && <Badge variant="secondary" className="text-[10px]">{f.category}</Badge>}
                <span>{(Number(f.size_bytes || 0) / 1024).toFixed(1)} KB</span>
              </div>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => onOpen(f)}><ExternalLink className="size-4 mr-1.5" /> Study</Button>
        </li>
      ))}
    </ul>
  );
}
