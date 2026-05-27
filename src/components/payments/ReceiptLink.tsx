import { useState } from "react";
import { getProofSignedUrl } from "@/lib/payments";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ReceiptLink({ path }: { path?: string | null }) {
  const [loading, setLoading] = useState(false);
  if (!path) return <span className="text-muted-foreground text-xs">—</span>;
  const open = async () => {
    setLoading(true);
    try {
      const url = await getProofSignedUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not open receipt");
    } finally { setLoading(false); }
  };
  return (
    <button type="button" onClick={open} className="inline-flex items-center gap-1 text-primary hover:underline text-xs">
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileText className="w-3 h-3" />}
      View receipt
    </button>
  );
}