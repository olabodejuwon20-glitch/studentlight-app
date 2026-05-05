import { BookOpen } from "lucide-react";
import { studentResults } from "@/data/mock";

export default function StudentClasses() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {studentResults.map((r) => (
        <div key={r.subject} className="rounded-xl bg-card border border-border p-5 shadow-card hover:shadow-soft transition-shadow">
          <div className="size-10 rounded-lg bg-student/10 text-student grid place-items-center"><BookOpen className="size-5" /></div>
          <div className="mt-4 font-display font-semibold">{r.subject}</div>
          <div className="text-xs text-muted-foreground mt-1">SS2 A · 28 students</div>
          <div className="mt-4 text-xs text-muted-foreground">Current grade: <span className="font-semibold text-foreground">{r.grade}</span></div>
        </div>
      ))}
    </div>
  );
}
