export type TermBreakdown = {
  weights: { ca: number; assignment: number; exam: number; report: number };
  ca: { sum: number; max: number; pct: number };
  assignment: { avg_pct: number; count: number };
  exam: { pct: number };
  report: { pct: number | null };
  total: number;
  grade: string;
  computed_at?: string;
};

export function isTermBreakdown(x: any): x is TermBreakdown {
  return !!x && typeof x === "object" && x.weights && x.ca && x.assignment && x.exam;
}

export type ComponentKey = "ca" | "assignment" | "exam" | "report";

export const COMPONENT_LABELS: Record<ComponentKey, string> = {
  ca: "CA / Tests",
  assignment: "Assignments",
  exam: "Exam",
  report: "Report",
};

export const COMPONENT_COLORS: Record<ComponentKey, string> = {
  ca: "hsl(var(--info))",
  assignment: "hsl(var(--warning))",
  exam: "hsl(var(--primary))",
  report: "hsl(var(--success))",
};

/** Contribution each component adds to the final total (out of 100). */
export function componentContributions(b: TermBreakdown) {
  const w = b.weights;
  return {
    ca: round2((w.ca / 100) * (b.ca.pct ?? 0)),
    assignment: round2((w.assignment / 100) * (b.assignment.avg_pct ?? 0)),
    exam: round2((w.exam / 100) * (b.exam.pct ?? 0)),
    report: round2((w.report / 100) * (b.report.pct ?? 0)),
  };
}

function round2(n: number) { return Math.round(n * 100) / 100; }