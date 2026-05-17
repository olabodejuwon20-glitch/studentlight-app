import { cn } from "@/lib/utils";

const PLAN_STYLES: Record<string, string> = {
  trial: "bg-info/10 text-info border-info/20",
  starter: "bg-muted text-foreground border-border",
  pro: "bg-primary/10 text-primary border-primary/20",
  enterprise: "bg-foreground text-background border-foreground",
  custom: "bg-accent text-accent-foreground border-border",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-success-soft text-success border-success/20",
  trial: "bg-info/10 text-info border-info/20",
  past_due: "bg-warning-soft text-warning border-warning/20",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground border-border",
};

export function PlanBadge({ plan }: { plan?: string | null }) {
  const k = (plan ?? "trial").toLowerCase();
  const cls = PLAN_STYLES[k] ?? PLAN_STYLES.trial;
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium capitalize", cls)}>{k}</span>;
}

export function SchoolStatusBadge({ status }: { status?: string | null }) {
  const k = (status ?? "trial").toLowerCase();
  const cls = STATUS_STYLES[k] ?? STATUS_STYLES.trial;
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium capitalize", cls)}>{k.replace("_", " ")}</span>;
}
