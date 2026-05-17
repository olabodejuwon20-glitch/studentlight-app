import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 pb-6 border-b border-border/60 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function MetricCard({ label, value, delta, icon }: { label: string; value: ReactNode; delta?: { value: string; positive?: boolean }; icon?: ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="text-2xl font-semibold tabular-nums tracking-tight">{value}</div>
      {delta && (
        <div className={cn("text-xs mt-2 font-medium", delta.positive ? "text-success" : "text-destructive")}>
          {delta.positive ? "↑" : "↓"} {delta.value}
        </div>
      )}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  active: "bg-success-soft text-success border-success/20",
  trial: "bg-info/10 text-info border-info/20",
  suspended: "bg-destructive/10 text-destructive border-destructive/20",
  expired: "bg-warning-soft text-warning border-warning/20",
  open: "bg-info/10 text-info border-info/20",
  in_progress: "bg-warning-soft text-warning border-warning/20",
  resolved: "bg-success-soft text-success border-success/20",
  closed: "bg-muted text-muted-foreground border-border",
  high: "bg-warning-soft text-warning border-warning/20",
  critical: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-muted text-muted-foreground border-border",
  low: "bg-muted text-muted-foreground border-border",
  normal: "bg-muted text-muted-foreground border-border",
  paid: "bg-success-soft text-success border-success/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  pending: "bg-warning-soft text-warning border-warning/20",
  beta: "bg-accent text-accent-foreground border-border",
  archived: "bg-muted text-muted-foreground border-border",
};
export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_STYLES[status?.toLowerCase()] ?? "bg-muted text-muted-foreground border-border";
  return <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium capitalize", cls)}>{status?.replace("_", " ")}</span>;
}

export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-12 text-center">
      {icon && <div className="mx-auto mb-3 size-10 rounded-lg bg-muted grid place-items-center text-muted-foreground">{icon}</div>}
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Section({ title, description, children, actions }: { title: string; description?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <header className="px-5 py-4 border-b border-border flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
        </div>
        {actions}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Skel({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}