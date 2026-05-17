import { PageHeader, EmptyState } from "@/components/super/primitives";
import { Sparkles } from "lucide-react";

export default function ComingSoon({ title, description }: { title: string; description?: string }) {
  return (
    <div>
      <PageHeader title={title} description={description ?? "This module is part of the upcoming phase."} />
      <EmptyState
        icon={<Sparkles className="size-5" />}
        title="Shipping soon"
        description="The schema is ready. This surface lands in the next phase of the Super Admin OS rollout."
      />
    </div>
  );
}
