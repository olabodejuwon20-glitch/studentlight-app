// NECO/WAEC-aligned grading scale (Nigeria)
export type NecoGrade = "A1" | "B2" | "B3" | "C4" | "C5" | "C6" | "D7" | "E8" | "F9";

export function necoGrade(score: number): NecoGrade {
  const s = Number(score);
  if (s >= 75) return "A1";
  if (s >= 70) return "B2";
  if (s >= 65) return "B3";
  if (s >= 60) return "C4";
  if (s >= 55) return "C5";
  if (s >= 50) return "C6";
  if (s >= 45) return "D7";
  if (s >= 40) return "E8";
  return "F9";
}

export const NECO_GRADE_ORDER: NecoGrade[] = ["A1","B2","B3","C4","C5","C6","D7","E8","F9"];

export const NECO_GRADE_REMARKS: Record<NecoGrade, string> = {
  A1: "Excellent", B2: "Very Good", B3: "Good", C4: "Credit",
  C5: "Credit", C6: "Credit", D7: "Pass", E8: "Pass", F9: "Fail",
};

export const NECO_GRADE_COLORS: Record<NecoGrade, string> = {
  A1: "hsl(var(--success))",
  B2: "hsl(var(--success))",
  B3: "hsl(142 60% 55%)",
  C4: "hsl(var(--info))",
  C5: "hsl(var(--info))",
  C6: "hsl(199 70% 65%)",
  D7: "hsl(var(--warning))",
  E8: "hsl(35 90% 60%)",
  F9: "hsl(var(--destructive))",
};

// Distribution of grades from a list of scores
export function necoDistribution(scores: number[]) {
  const counts: Record<NecoGrade, number> = {
    A1: 0, B2: 0, B3: 0, C4: 0, C5: 0, C6: 0, D7: 0, E8: 0, F9: 0,
  };
  scores.forEach(s => { counts[necoGrade(s)]++; });
  return NECO_GRADE_ORDER.map(g => ({ grade: g, count: counts[g], color: NECO_GRADE_COLORS[g] }));
}

// % credit pass = C6 or better
export function necoCreditPassRate(scores: number[]) {
  if (!scores.length) return 0;
  const credits = scores.filter(s => s >= 50).length;
  return Math.round((credits / scores.length) * 100);
}

export function necoSummary(scores: number[]) {
  const n = scores.length;
  const avg = n ? scores.reduce((a,b)=>a+Number(b),0)/n : 0;
  return {
    count: n,
    average: Math.round(avg),
    credit: necoCreditPassRate(scores),
    grade: necoGrade(avg),
    best: n ? Math.max(...scores.map(Number)) : 0,
    worst: n ? Math.min(...scores.map(Number)) : 0,
  };
}
