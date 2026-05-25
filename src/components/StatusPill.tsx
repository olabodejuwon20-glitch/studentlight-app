import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "default" | "success" | "warning" | "danger" | "info" | "muted";

const TONES: Record<Tone, string> = {
  default: "bg-muted text-foreground border-border",
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning-foreground border-warning/30",
  danger:  "bg-destructive/15 text-destructive border-destructive/30",
  info:    "bg-primary/10 text-primary border-primary/30",
  muted:   "bg-secondary text-muted-foreground border-border",
};

export function StatusPill({ tone = "default", icon, children, className }: {
  tone?: Tone; icon?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border",
      TONES[tone], className,
    )}>
      {icon}
      {children}
    </span>
  );
}