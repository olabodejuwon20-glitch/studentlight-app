import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { pendingGrading } from "@/data/mock";
import { toast } from "sonner";

export default function Grading() {
  const [scores, setScores] = useState<Record<number, string>>({});
  return (
    <SectionCard
      title="Grading Center"
      description={`${pendingGrading.length} submissions awaiting your review`}
      action={<Button onClick={() => toast.success("Grades submitted")}>Publish Grades</Button>}
    >
      <table className="w-full text-sm">
        <thead><tr className="text-xs uppercase text-muted-foreground border-b border-border">
          <th className="text-left font-medium py-3 pr-4">Student</th><th className="text-left font-medium py-3 pr-4">Class</th>
          <th className="text-left font-medium py-3 pr-4">Assessment</th><th className="text-left font-medium py-3 pr-4">Due</th>
          <th className="text-left font-medium py-3 pr-4">Score (/100)</th><th className="text-left font-medium py-3 pr-4">Status</th>
        </tr></thead>
        <tbody>
          {pendingGrading.map((p, i) => {
            const score = scores[i];
            return (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="py-3 pr-4 font-medium">{p.student}</td>
                <td className="py-3 pr-4">{p.class}</td>
                <td className="py-3 pr-4">{p.assessment}</td>
                <td className="py-3 pr-4 text-muted-foreground">{p.due}</td>
                <td className="py-3 pr-4 w-32"><Input type="number" min={0} max={100} value={scores[i] ?? ""} onChange={e => setScores(s => ({...s, [i]: e.target.value}))} /></td>
                <td className="py-3 pr-4"><Badge variant="outline" className={score ? "border-success/30 bg-success/10 text-success" : "border-warning/30 bg-warning/10 text-warning"}>{score ? "Graded" : "Pending"}</Badge></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </SectionCard>
  );
}
