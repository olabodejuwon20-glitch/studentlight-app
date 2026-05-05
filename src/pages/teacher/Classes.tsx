import { Users, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { teacherClasses } from "@/data/mock";

export default function TeacherClassesPage() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {teacherClasses.map((c) => (
        <div key={c.code} className="rounded-xl bg-card border border-border p-5 shadow-card hover:shadow-soft transition-all">
          <div className="size-11 rounded-lg bg-teacher/10 text-teacher grid place-items-center"><BookOpen className="size-5" /></div>
          <div className="mt-4 font-display font-semibold text-lg">{c.code}</div>
          <div className="text-xs text-muted-foreground">{c.subject}</div>
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Users className="size-4" /> {c.students}</span>
            <span className="text-success font-semibold">{c.attendance}%</span>
          </div>
          <Button variant="secondary" className="w-full mt-4">Manage</Button>
        </div>
      ))}
    </div>
  );
}
