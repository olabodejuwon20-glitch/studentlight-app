import { useEffect, useState } from "react";
import { FileText, Download, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Library() {
  const { school } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  useEffect(() => {
    if (!school) return;
    supabase.from("library_files").select("*").eq("school_id", school.id).order("created_at", { ascending: false }).then(({ data }) => setRows(data ?? []));
  }, [school]);

  async function open(r: any) {
    const { data } = await supabase.storage.from("library").createSignedUrl(r.storage_path, 60 * 5);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  const filtered = rows.filter(r => !q || r.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <SectionCard title="Library" action={
      <div className="relative w-56">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search resources" className="pl-9 h-9" />
      </div>
    }>
      {filtered.length === 0 ? <EmptyState icon={FileText} title="No resources yet" desc="Teachers and admins can upload files here." /> :
        <ul className="divide-y divide-border">{filtered.map(f => (
          <li key={f.id} className="py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-9 rounded-lg bg-success/10 grid place-items-center shrink-0"><FileText className="size-4 text-success" /></div>
              <div className="min-w-0"><div className="font-medium truncate">{f.name}</div><div className="text-xs text-muted-foreground">{f.category || "general"} · {(Number(f.size_bytes||0)/1024).toFixed(1)} KB</div></div>
            </div>
            <Button size="sm" variant="outline" onClick={() => open(f)}><Download className="size-4 mr-2" />Open</Button>
          </li>
        ))}</ul>}
    </SectionCard>
  );
}
