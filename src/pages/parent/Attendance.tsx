import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { attendanceLog } from "@/data/mock";

const TONE: Record<string, string> = { Present: "border-success/30 bg-success/10 text-success", Absent: "border-destructive/30 bg-destructive/10 text-destructive", Late: "border-warning/30 bg-warning/10 text-warning" };

export default function ParentAttendance() {
  return (
    <SectionCard title="Attendance Details" description="Daily attendance log">
      <table className="w-full text-sm">
        <thead><tr className="text-xs uppercase text-muted-foreground border-b border-border">
          <th className="text-left font-medium py-3 pr-4">Date</th><th className="text-left font-medium py-3 pr-4">Day</th>
          <th className="text-left font-medium py-3 pr-4">Status</th><th className="text-left font-medium py-3 pr-4">Class</th>
        </tr></thead>
        <tbody>
          {attendanceLog.map((a, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              <td className="py-3 pr-4">{a.date}</td>
              <td className="py-3 pr-4 text-muted-foreground">{a.day}</td>
              <td className="py-3 pr-4"><Badge variant="outline" className={TONE[a.status]}>{a.status}</Badge></td>
              <td className="py-3 pr-4">{a.class}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  );
}
