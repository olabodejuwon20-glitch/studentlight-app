import { Calendar as CalendarIcon } from "lucide-react";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { upcomingExams } from "@/data/mock";

export default function StudentCalendar() {
  return (
    <SectionCard title="Upcoming Events">
      <ul className="space-y-3">
        {upcomingExams.map((e, i) => (
          <li key={i} className="flex items-center gap-4 p-4 rounded-lg border border-border">
            <div className="size-12 rounded-lg bg-student/10 text-student grid place-items-center"><CalendarIcon className="size-5" /></div>
            <div className="flex-1">
              <div className="font-medium">{e.subject}</div>
              <div className="text-xs text-muted-foreground">{e.date}</div>
            </div>
            <span className="text-xs text-warning font-semibold">{e.left}</span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
