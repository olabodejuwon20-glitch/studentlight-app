import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, title, desc, action }: { icon: LucideIcon; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="py-16 text-center">
      <div className="size-14 rounded-full bg-secondary text-muted-foreground grid place-items-center mx-auto"><Icon className="size-6" /></div>
      <div className="mt-3 font-semibold">{title}</div>
      {desc && <div className="text-sm text-muted-foreground mt-1">{desc}</div>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
