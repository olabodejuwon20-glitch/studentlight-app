import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { studentResults } from "@/data/mock";

const teachers: Record<string, string> = { Mathematics: "Mr. Smith", "English Language": "Mrs. Johnson", Physics: "Mr. Williams", Chemistry: "Mrs. Brown", Biology: "Mr. Adeyemi", "Civic Education": "Mrs. Okafor" };

export default function ParentResults() {
  return (
    <SectionCard title="Academic Records" description="Third Term"
      action={
        <div className="flex gap-2">
          <Select defaultValue="this"><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="this">This Term</SelectItem><SelectItem value="last">Last Term</SelectItem></SelectContent></Select>
          <Select defaultValue="all"><SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Subjects</SelectItem></SelectContent></Select>
        </div>
      }>
      <table className="w-full text-sm">
        <thead><tr className="text-xs uppercase text-muted-foreground border-b border-border">
          <th className="text-left font-medium py-3 pr-4">Subject</th><th className="text-left font-medium py-3 pr-4">Score</th>
          <th className="text-left font-medium py-3 pr-4">Grade</th><th className="text-left font-medium py-3 pr-4">Teacher</th>
          <th className="text-left font-medium py-3 pr-4">Remarks</th>
        </tr></thead>
        <tbody>
          {studentResults.map((r) => (
            <tr key={r.subject} className="border-b border-border last:border-0">
              <td className="py-3 pr-4 font-medium">{r.subject}</td>
              <td className="py-3 pr-4">{r.score}%</td>
              <td className="py-3 pr-4"><Badge variant="outline" className="border-success/30 bg-success/10 text-success">{r.grade}</Badge></td>
              <td className="py-3 pr-4 text-muted-foreground">{teachers[r.subject] ?? "—"}</td>
              <td className="py-3 pr-4">{r.remark}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  );
}
