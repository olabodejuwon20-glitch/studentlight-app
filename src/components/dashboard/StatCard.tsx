import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  label: string;
  value: string;
  trend?: string;
  sub?: string;
  icon: LucideIcon;
  tone?: "info" | "success" | "warning" | "student" | "parent" | "admin" | "teacher";
}

const TONE: Record<string, { bg: string; fg: string }> = {
  info:    { bg: "bg-info/10",       fg: "text-info" },
  success: { bg: "bg-success/10",    fg: "text-success" },
  warning: { bg: "bg-warning/10",    fg: "text-warning" },
  student: { bg: "bg-student/10",    fg: "text-student" },
  parent:  { bg: "bg-parent/10",     fg: "text-parent" },
  admin:   { bg: "bg-admin/10",      fg: "text-admin" },
  teacher: { bg: "bg-teacher/10",    fg: "text-teacher" },
};

export function StatCard({ label, value, trend, sub, icon: Icon, tone = "info" }: Props) {
  const t = TONE[tone];
  return (
    <div className="group rounded-xl bg-card border border-border p-5 shadow-card hover:shadow-soft transition-all">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className="mt-2 text-2xl sm:text-[28px] font-display font-bold tracking-tight">{value}</div>
        </div>
        <div className={cn("size-11 grid place-items-center rounded-lg shrink-0", t.bg)}>
          <Icon className={cn("size-5", t.fg)} />
        </div>
      </div>
      {trend && (
        <div className="mt-3 text-xs font-medium text-success flex items-center gap-1">
          <span>↑ {trend}</span>
          <span className="text-muted-foreground font-normal">from last term</span>
        </div>
      )}
      {sub && !trend && <div className={cn("mt-3 text-xs font-medium", t.fg)}>{sub}</div>}
    </div>
  );
}
