import { TermBreakdown, componentContributions, COMPONENT_LABELS, COMPONENT_COLORS, ComponentKey, isTermBreakdown } from "@/lib/termResult";

export function TermBreakdownBar({ breakdown }: { breakdown: unknown }) {
  if (!isTermBreakdown(breakdown)) return null;
  const b = breakdown as TermBreakdown;
  const contrib = componentContributions(b);
  const keys: ComponentKey[] = ["ca", "assignment", "exam", "report"];
  const total = b.total || 0;
  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
        {keys.map((k) => {
          const v = contrib[k];
          const width = total > 0 ? (v / total) * 100 : 0;
          if (!width) return null;
          return <span key={k} style={{ width: `${width}%`, background: COMPONENT_COLORS[k] }} />;
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
        {keys.map((k) => {
          const w = b.weights[k];
          if (!w) return null;
          const src = k === "ca" ? `${b.ca.pct}%` :
                       k === "assignment" ? `${b.assignment.avg_pct}%` :
                       k === "exam" ? `${b.exam.pct}%` :
                       b.report.pct != null ? `${b.report.pct}%` : "—";
          return (
            <span key={k} className="inline-flex items-center gap-1">
              <span className="size-1.5 rounded-full" style={{ background: COMPONENT_COLORS[k] }} />
              {COMPONENT_LABELS[k]} <span className="tabular-nums">{src}</span>
              <span className="opacity-60">×{w}%</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}