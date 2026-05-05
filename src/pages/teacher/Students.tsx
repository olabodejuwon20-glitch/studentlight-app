import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { students } from "@/data/mock";

export default function TeacherStudents() {
  return (
    <SectionCard title="Students in your classes" description={`${students.length} students`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {students.map(s => (
          <div key={s.id} className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-secondary/40">
            <Avatar className="size-11"><AvatarFallback className="bg-teacher/15 text-teacher text-xs font-semibold">{s.name.split(" ").map(p=>p[0]).slice(0,2).join("")}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{s.name}</div>
              <div className="text-xs text-muted-foreground">{s.class} · {s.admission}</div>
            </div>
            <Badge variant="outline" className={s.status === "Active" ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive"}>{s.status}</Badge>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}
