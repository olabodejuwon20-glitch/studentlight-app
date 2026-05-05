import { BookOpen, Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { teacherClasses } from "@/data/mock";

export default function AdminClasses() {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end"><Button><Plus className="size-4 mr-1.5" /> New Class</Button></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...teacherClasses, ...teacherClasses].map((c, i) => (
          <div key={i} className="rounded-xl bg-card border border-border p-5 shadow-card hover:shadow-soft transition-all">
            <div className="size-10 rounded-lg bg-primary/10 grid place-items-center text-primary"><BookOpen className="size-5" /></div>
            <div className="mt-4 font-display font-semibold">{c.code}</div>
            <div className="text-xs text-muted-foreground">{c.subject}</div>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Users className="size-3.5" /> {c.students} students</span>
              <span className="text-success font-medium">{c.attendance}% attd.</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
