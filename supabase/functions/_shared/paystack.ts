// Shared Paystack helpers. Picks live key when present, otherwise falls back to test key.
// This lets the same code run with PAYSTACK_TEST_SECRET_KEY today and switch to live
// automatically once PAYSTACK_SECRET_KEY is added — no code changes required.
export function getPaystackKey(): { key: string; mode: "live" | "test" } | null {
  const live = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (live && live.trim()) return { key: live.trim(), mode: "live" };
  const test = Deno.env.get("PAYSTACK_TEST_SECRET_KEY");
  if (test && test.trim()) return { key: test.trim(), mode: "test" };
  return null;
}

export const PAYSTACK_BASE = "https://api.paystack.co";

export async function paystackInit(body: Record<string, unknown>) {
  const k = getPaystackKey();
  if (!k) throw new Error("paystack_not_configured");
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: { Authorization: `Bearer ${k.key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!data.status) throw new Error("paystack_init_failed: " + (data.message || res.status));
  return { ...data.data, mode: k.mode } as { authorization_url: string; reference: string; access_code: string; mode: "live" | "test" };
}

export async function paystackVerify(reference: string) {
  const k = getPaystackKey();
  if (!k) throw new Error("paystack_not_configured");
  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${k.key}` },
  });
  const data = await res.json();
  if (!data.status) throw new Error("paystack_verify_failed: " + (data.message || res.status));
  return data.data as { status: string; reference: string; amount: number; currency: string; metadata: any };
}