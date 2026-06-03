// Ingests a document into the RAG index.
// Input: { document_id } OR { school_id, title, source_path, ...optional visibility/class/student/subject }
// If source_path is provided, the file is downloaded from the `library` bucket and parsed.
// Falls back to a `text` payload for manual entries.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, getAuthedUser } from "../_shared/ai-call.ts";
import { embedTexts, chunkText } from "../_shared/embed.ts";

const admin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function extractText(bytes: Uint8Array, mime: string | null): Promise<string> {
  // MVP: only treat text/* and json as parseable directly. For PDF/DOCX we
  // currently store as-is and ingest the filename/title. A richer parser
  // will replace this in a follow-up.
  const m = (mime || "").toLowerCase();
  if (m.startsWith("text/") || m.includes("json") || m.includes("markdown")) {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  }
  // Best-effort: try utf8 decode anyway; if it produces mostly binary, return empty.
  try {
    const s = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    const printable = s.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "").length;
    if (printable / Math.max(s.length, 1) > 0.7) return s;
  } catch (_) {}
  return "";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const user = await getAuthedUser(req);
    if (!user) return jsonResponse({ error: "unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    let docId: string | null = body.document_id ?? null;

    // Membership check helper — caller must be admin/teacher of the school
    async function assertMember(school_id: string) {
      if (!school_id) return jsonResponse({ error: "school_id required" }, 400);
      const { data: mem } = await admin
        .from("memberships")
        .select("role")
        .eq("school_id", school_id)
        .eq("user_id", user!.id)
        .eq("status", "active")
        .maybeSingle();
      if (!mem || !["admin", "teacher"].includes(mem.role)) {
        return jsonResponse({ error: "Forbidden" }, 403);
      }
      return null;
    }

    // If no document_id, create one
    if (!docId) {
      const { school_id, title, source_path, mime_type, visibility, class_id, student_id, subject_code, curriculum, text } = body;
      if (!school_id || !title) return jsonResponse({ error: "school_id and title required" }, 400);
      const forbidden = await assertMember(school_id);
      if (forbidden) return forbidden;
      const { data: d, error } = await admin.from("knowledge_documents").insert({
        school_id, title, source_path: source_path ?? null, mime_type: mime_type ?? null,
        visibility: visibility ?? "school", class_id: class_id ?? null, student_id: student_id ?? null,
        subject_code: subject_code ?? null, curriculum: curriculum ?? null,
        uploaded_by: user.id, status: "processing",
        metadata: text ? { inline_text: true } : {},
      }).select("id").single();
      if (error) throw error;
      docId = d.id;
      if (text) {
        (body as any).__inline_text = text;
      }
    } else {
      // Re-ingest path: load doc first, then verify caller membership in its school
      const { data: existing } = await admin
        .from("knowledge_documents").select("school_id").eq("id", docId).maybeSingle();
      if (!existing) return jsonResponse({ error: "document not found" }, 404);
      const forbidden = await assertMember(existing.school_id);
      if (forbidden) return forbidden;
      await admin.from("knowledge_documents").update({ status: "processing", error: null }).eq("id", docId);
    }

    const { data: doc, error: dErr } = await admin
      .from("knowledge_documents").select("*").eq("id", docId!).single();
    if (dErr || !doc) throw dErr ?? new Error("document not found");

    // Pull source content
    let text = (body as any).__inline_text as string | undefined;
    if (!text && doc.source_path) {
      const { data: file, error: fErr } = await admin.storage.from("library").download(doc.source_path);
      if (fErr) throw fErr;
      const buf = new Uint8Array(await file.arrayBuffer());
      text = await extractText(buf, doc.mime_type);
    }
    if (!text || !text.trim()) {
      await admin.from("knowledge_documents").update({
        status: "error", error: "no extractable text (binary parsing not yet supported)",
      }).eq("id", doc.id);
      return jsonResponse({ ok: false, document_id: doc.id, error: "no extractable text" });
    }

    const chunks = chunkText(text, 1000, 150);
    // Embed in batches of 64
    const allVecs: number[][] = [];
    for (let i = 0; i < chunks.length; i += 64) {
      const batch = chunks.slice(i, i + 64);
      const vecs = await embedTexts(batch);
      allVecs.push(...vecs);
    }

    // Wipe any prior chunks then insert
    await admin.from("knowledge_chunks").delete().eq("document_id", doc.id);
    const rows = chunks.map((c, idx) => ({
      document_id: doc.id,
      school_id: doc.school_id,
      chunk_index: idx,
      content: c,
      token_count: Math.round(c.length / 4),
      embedding: allVecs[idx] as any,
    }));
    // Insert in batches of 200 to stay under payload limits
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await admin.from("knowledge_chunks").insert(rows.slice(i, i + 200));
      if (error) throw error;
    }

    await admin.from("knowledge_documents").update({
      status: "ready", chunk_count: chunks.length, error: null,
    }).eq("id", doc.id);

    return jsonResponse({ ok: true, document_id: doc.id, chunks: chunks.length });
  } catch (e: any) {
    console.error("ingest-knowledge error", e);
    return jsonResponse({ error: String(e?.message || e) }, 500);
  }
});