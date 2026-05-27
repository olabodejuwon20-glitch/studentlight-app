import { supabase } from "@/integrations/supabase/client";
import { friendlyInvokeError } from "@/lib/errors";

function b64ToBlob(b64: string, mime = "application/pdf") {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

export async function fetchResultSlip(studentId: string, term?: string) {
  const { data, error } = await supabase.functions.invoke("generate-result-slip", {
    body: { student_id: studentId, term },
  });
  if (error) throw new Error(await friendlyInvokeError(error, "We couldn't generate the result slip. Please try again."));
  if ((data as any)?.error) throw new Error((data as any).error);
  const { pdf_base64, filename, mime } = data as { pdf_base64: string; filename: string; mime: string };
  return { blob: b64ToBlob(pdf_base64, mime), filename };
}

export async function downloadResultSlip(studentId: string, term?: string) {
  const { blob, filename } = await fetchResultSlip(studentId, term);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
