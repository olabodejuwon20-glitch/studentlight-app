import { FileCheck, Upload, UserX, Award, FileText } from "lucide-react";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { activityFeed } from "@/data/mock";

const ICONS: Record<string, any> = { fileCheck: FileCheck, upload: Upload, userX: UserX, award: Award };

export default function ParentActivity() {
  return (
    <SectionCard title="Activity Feed" description="Latest activity for your child">
      <ul className="space-y-3">
        {activityFeed.map((a, i) => {
          const Icon = ICONS[a.icon] ?? FileText;
          return (
            <li key={i} className="flex items-center gap-3 p-4 rounded-lg border border-border">
              <div className="size-10 rounded-lg bg-parent/10 text-parent grid place-items-center shrink-0"><Icon className="size-5" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{a.title}</div>
                <div className="text-xs text-muted-foreground">{a.desc}</div>
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{a.time}</span>
            </li>
          );
        })}
      </ul>
    </SectionCard>
  );
}
