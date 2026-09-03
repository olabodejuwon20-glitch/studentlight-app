// Shared embedding helper. Calls AI Gateway /embeddings.
// Returns vectors via Google text-embedding-004 (matches knowledge_chunks column).
const EMBED_URL = Deno.env.get("AI_EMBED_URL") ?? (
  (Deno.env.get("AI_GATEWAY_URL") ?? "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions")
    .replace("/chat/completions", "/embeddings")
);

export async function embedTexts(inputs: string[], model = "text-embedding-004"): Promise<number[][]> {
  if (inputs.length === 0) return [];
  const r = await fetch(EMBED_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("AI_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, input: inputs }),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`embed gateway error ${r.status}: ${text.slice(0, 300)}`);
  }
  const data = await r.json();
  return (data.data ?? []).map((d: any) => d.embedding as number[]);
}

export async function embedOne(input: string, model?: string): Promise<number[]> {
  const [v] = await embedTexts([input], model);
  return v;
}

/** Naive char-based chunker with overlap. */
export function chunkText(text: string, size = 1000, overlap = 150): string[] {
  const clean = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (clean.length <= size) return clean ? [clean] : [];
  const out: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(i + size, clean.length);
    out.push(clean.slice(i, end));
    if (end === clean.length) break;
    i = end - overlap;
  }
  return out;
}