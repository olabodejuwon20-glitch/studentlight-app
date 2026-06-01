import { supabase } from "@/integrations/supabase/client";

export type Attachment = {
  type: "image" | "file" | "audio";
  url: string;       // public or signed URL
  path: string;      // storage path inside the bucket
  name: string;
  size?: number;
  mime?: string;
  duration?: number; // for audio (sec)
  transcript?: string; // for audio (tutor uses this)
};

/** Upload a Blob/File to a private bucket under {userId}/{prefix}/{ts}-{name} and return a signed URL. */
export async function uploadPrivate(
  bucket: "tutor-uploads" | "message-attachments",
  userId: string,
  prefix: string,
  file: Blob,
  name: string,
): Promise<Attachment> {
  const safeName = name.replace(/[^\w.\-]+/g, "_");
  const path = `${userId}/${prefix}/${Date.now()}-${safeName}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) throw error;
  const { data: signed } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 7);
  const url = signed?.signedUrl ?? "";
  const mime = file.type || "application/octet-stream";
  const type: Attachment["type"] = mime.startsWith("image/")
    ? "image"
    : mime.startsWith("audio/")
      ? "audio"
      : "file";
  return { type, url, path, name: safeName, size: file.size, mime };
}

export async function refreshSignedUrl(bucket: string, path: string) {
  const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 7);
  return data?.signedUrl ?? "";
}

export function bytesToHuman(n?: number) {
  if (!n && n !== 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export async function blobToBase64(b: Blob): Promise<string> {
  const buf = await b.arrayBuffer();
  // chunked to avoid call-stack limits
  let bin = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(bin);
}