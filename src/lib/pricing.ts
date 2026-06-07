export type PlanPricing = {
  plan: string;
  label: string;
  term_price_kobo: number;
  included_students: number;
  extra_student_kobo: number;
  sort_order: number;
};

export type Addon = { id: string; slug: string; name: string; term_price_kobo: number };

export function formatNaira(kobo: number): string {
  const n = Math.max(0, Math.round((kobo ?? 0) / 100));
  return "₦" + n.toLocaleString("en-NG");
}

export function naira(kobo: number): number {
  return Math.round((kobo ?? 0) / 100);
}

export function kobo(nairaAmount: number | string): number {
  const n = typeof nairaAmount === "string" ? parseFloat(nairaAmount) : nairaAmount;
  return Math.round((isFinite(n) ? n : 0) * 100);
}

export type RevenueArgs = {
  plan: string;
  studentCount: number;
  includedOverride?: number | null;
  extraKoboOverride?: number | null;
  addons: Addon[];
  planPricing: PlanPricing[];
};

export type RevenueResult = {
  termKobo: number;
  annualKobo: number;
  basePlanKobo: number;
  extraStudentKobo: number;
  addonsKobo: number;
  extraStudents: number;
};

export function revenueForSchool(args: RevenueArgs): RevenueResult {
  const tier = args.planPricing.find(p => p.plan === args.plan);
  const basePlanKobo = tier?.term_price_kobo ?? 0;
  const included = args.includedOverride ?? tier?.included_students ?? 0;
  const perStudent = args.extraKoboOverride ?? tier?.extra_student_kobo ?? 0;
  const extraStudents = Math.max(0, (args.studentCount || 0) - included);
  const extraStudentKobo = extraStudents * perStudent;
  const addonsKobo = args.addons.reduce((s, a) => s + (a.term_price_kobo || 0), 0);
  const termKobo = basePlanKobo + extraStudentKobo + addonsKobo;
  return {
    termKobo,
    annualKobo: termKobo * 3,
    basePlanKobo,
    extraStudentKobo,
    addonsKobo,
    extraStudents,
  };
}