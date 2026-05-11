import { useEffect, useRef, useState } from "react";
import { FileText, Upload, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function TeacherResources() {
  const { school, user } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!school) return;
    const { data } = await supabase.from("library_files").select("*").eq("school_id", school.id).order("created_at", { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [school]);

  async function upload(file: File) {
    if (!school || !user) return;
    setBusy(true);
    try {
      const path = `${school.id}/${Date.now()}-${file.name}`;
      const { error: e1 } = await supabase.storage.from("library").upload(path, file);
      if (e1) throw e1;
      const { error: e2 } = await supabase.from("library_files").insert({ school_id: school.id, uploaded_by: user.id, name: file.name, storage_path: path, size_bytes: file.size, category: "resource" });
      if (e2) throw e2;
      toast.success("Uploaded"); await load();
    } catch (e: any) { toast.error(e.message); } finally { setBusy(false); }
  }

  async function remove(r: any) {
    await supabase.storage.from("library").remove([r.storage_path]);
    await supabase.from("library_files").delete().eq("id", r.id);
    await load();
  }

  return (
    <SectionCard title="Teaching resources" action={
      <>
        <input ref={ref} hidden type="file" onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
        <Button size="sm" onClick={() => ref.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Upload className="size-4 mr-2" />}Upload
        </Button>
      </>
    }>
      {rows.length === 0 ? <EmptyState icon={FileText} title="No resources yet" desc="Upload PDFs, slides or notes to share with your students." /> :
        <ul className="divide-y divide-border">{rows.map(r => (
          <li key={r.id} className="py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0"><FileText className="size-4 text-muted-foreground shrink-0" /><div className="min-w-0"><div className="font-medium truncate">{r.name}</div><div className="text-xs text-muted-foreground">{(Number(r.size_bytes||0)/1024).toFixed(1)} KB · {new Date(r.created_at).toLocaleDateString()}</div></div></div>
            {r.uploaded_by === user?.id && <Button variant="ghost" size="icon" onClick={() => remove(r)}><Trash2 className="size-4 text-destructive" /></Button>}
          </li>
        ))}</ul>}
    </SectionCard>
  );
}