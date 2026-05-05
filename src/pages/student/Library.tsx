import { Search, Download, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { libraryFiles } from "@/data/mock";
import { toast } from "sonner";

export default function Library() {
  return (
    <SectionCard title="Library" description={`${libraryFiles.length} resources available`}
      action={
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input placeholder="Search resources..." className="pl-9 w-[220px] bg-secondary/60 border-transparent" />
          </div>
          <Select defaultValue="all">
            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Categories</SelectItem><SelectItem value="m">Mathematics</SelectItem><SelectItem value="p">Physics</SelectItem></SelectContent>
          </Select>
        </div>
      }>
      <table className="w-full text-sm">
        <thead><tr className="text-xs uppercase text-muted-foreground border-b border-border">
          <th className="text-left font-medium py-3 pr-4">File Name</th><th className="text-left font-medium py-3 pr-4">Category</th>
          <th className="text-left font-medium py-3 pr-4">Date Added</th><th className="text-left font-medium py-3 pr-4">Action</th>
        </tr></thead>
        <tbody>
          {libraryFiles.map((f, i) => (
            <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/40">
              <td className="py-3 pr-4"><span className="inline-flex items-center gap-2"><FileText className="size-4 text-destructive" />{f.name}</span></td>
              <td className="py-3 pr-4"><Badge variant="outline" className="border-info/30 bg-info/10 text-info">{f.category}</Badge></td>
              <td className="py-3 pr-4 text-muted-foreground">{f.date}</td>
              <td className="py-3 pr-4"><Button variant="ghost" size="icon" className="size-8 text-primary" onClick={() => toast.success(`Downloading ${f.name}`)}><Download className="size-4" /></Button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  );
}
