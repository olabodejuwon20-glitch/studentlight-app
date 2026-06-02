import { useState } from "react";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AIMarkdown } from "@/components/ai/AIMarkdown";

export function ParentWeeklyDigest({ schoolId, studentId, studentName }: {
  schoolId: string; studentId: string; studentName?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [digest, setDigest] = useState("");

  async function generate() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-parent-digest", {
        body: { student_id: studentId, school_id: schoolId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setDigest((data as any)?.digest ?? "");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate digest");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SectionCard
      title="AI Weekly Digest"
      description={studentName ? `Personalized weekly summary for ${studentName}` : "Personalized weekly summary"}
      action={digest ? (
        <Button size="sm" variant="ghost" onClick={generate} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        </Button>
      ) : null}
    >
      {!digest && !loading && (
        <div className="flex flex-col items-center text-center gap-3 py-6">
          <div className="size-12 rounded-full bg-primary/10 grid place-items-center">
            <Sparkles className="size-6 text-primary" />
          </div>
          <div>
            <div className="font-medium">Get this week in one read</div>
            <p className="text-xs text-muted-foreground max-w-sm">Attendance, new results, behavior notes and what's coming up — summarized by AI from your child's records.</p>
          </div>
          <Button onClick={generate} className="gap-1.5"><Sparkles className="size-4" /> Generate digest</Button>
        </div>
      )}
      {loading && !digest && (
        <div className="flex items-center justify-center py-8 gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Reading the week…
        </div>
      )}
      {digest && (
        <div>
          <AIMarkdown content={digest} compact />
          <p className="text-[11px] text-muted-foreground mt-3">AI-generated from your child's records. Verify with the school for anything important.</p>
        </div>
      )}
    </SectionCard>
  );
}