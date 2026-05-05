import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { studentResults } from "@/data/mock";
import { cn } from "@/lib/utils";

const TONE: Record<string, string> = { A: "text-success", B: "text-info", C: "text-warning", D: "text-destructive" };

export default function StudentResults() {
  return (
    <SectionCard title="Results" description="This Term"
      action={
        <Select defaultValue="this">
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="this">This Term</SelectItem><SelectItem value="last">Last Term</SelectItem></SelectContent>
        </Select>
      }>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {studentResults.map((r) => (
          <div key={r.subject} className="rounded-xl border border-border p-5 bg-card hover:shadow-soft transition-shadow">
            <div className="text-xs text-muted-foreground">{r.subject}</div>
            <div className={cn("mt-2 text-3xl font-display font-bold", TONE[r.grade])}>{r.score}%</div>
            <div className="mt-2 text-sm">Grade: <span className={cn("font-semibold", TONE[r.grade])}>{r.grade}</span></div>
            <div className="text-xs text-muted-foreground mt-1">{r.remark}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
