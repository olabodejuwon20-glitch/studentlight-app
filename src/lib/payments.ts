import { supabase } from "@/integrations/supabase/client";

export const PAYMENT_CATEGORIES = [
  "tuition", "levy", "uniform", "exam", "hostel", "transport", "excursion", "book", "other",
] as const;

export const RECURRENCES = ["one_off", "termly", "sessional", "monthly"] as const;
export const AUDIENCES = ["school", "level", "class", "custom"] as const;

export function naira(kobo: number | null | undefined) {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format((kobo ?? 0) / 100);
}

export function toKobo(naira: number | string) {
  const n = typeof naira === "string" ? parseFloat(naira) : naira;
  return Math.round((isFinite(n) ? n : 0) * 100);
}

export function invoiceStatusColor(status: string) {
  switch (status) {
    case "paid": return "bg-success/10 text-success border-success/30";
    case "partial": return "bg-primary/10 text-primary border-primary/30";
    case "overdue": return "bg-destructive/10 text-destructive border-destructive/30";
    case "waived":
    case "cancelled": return "bg-muted text-muted-foreground border-border";
    default: return "bg-warning/10 text-warning border-warning/30";
  }
}

export async function startPaystackCheckout(invoiceId: string, amountKobo: number) {
  const { data, error } = await supabase.functions.invoke("payments-checkout", {
    body: { invoice_id: invoiceId, amount_kobo: amountKobo },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).message || (data as any).error);
  return data as { authorization_url: string; reference: string };
}

export async function recordOfflinePayment(opts: { invoice_id: string; amount_kobo: number; method: "cash" | "bank_transfer" | "pos" | "waiver"; notes?: string; proof_url?: string }) {
  const { data, error } = await supabase.functions.invoke("payments-record-offline", { body: opts });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data;
}

export async function issueInvoices(payment_type_id: string, student_ids?: string[]) {
  const { data, error } = await supabase.functions.invoke("issue-invoices", {
    body: { payment_type_id, student_ids },
  });
  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as { ok: true; issued: number };
}