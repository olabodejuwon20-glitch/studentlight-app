import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  meta?: ReactNode;
  className?: string;
}

export function FilterBar({ children, meta, className }: Props) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card/50 px-3 py-2", className)}>
      <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">Filters</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
      {meta && <div className="ml-auto text-xs text-muted-foreground">{meta}</div>}
    </div>
  );
}