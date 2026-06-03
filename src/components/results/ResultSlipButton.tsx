import { useState } from "react";
import { FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadResultSlip } from "@/lib/slip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function ResultSlipButton({
  studentId,
  term,
  disabled,
  className,
  size = "default",
  variant = "default",
  fullWidthOnMobile = true,
}: {
  studentId?: string;
  term?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "secondary";
  fullWidthOnMobile?: boolean;
}) {
  const [loading, setLoading] = useState(false);
  async function handle() {
    if (!studentId) return;
    setLoading(true);
    try {
      await downloadResultSlip(studentId, term);
      toast.success("Result slip downloaded");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate slip");
    } finally { setLoading(false); }
  }
  return (
    <Button
      onClick={handle}
      size={size}
      variant={variant}
      disabled={!studentId || disabled || loading}
      className={cn(fullWidthOnMobile && "w-full sm:w-auto", className)}
    >
      {loading ? <Loader2 className="size-4 animate-spin sm:mr-2" /> : <FileDown className="size-4 sm:mr-2" />}
      <span className={cn("ml-2 sm:ml-0")}>{loading ? "Generating slip…" : "Download Result Slip"}</span>
    </Button>
  );
}