import { MessagesSquare } from "lucide-react";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Button } from "@/components/ui/button";

export default function ParentMessages() {
  return (
    <SectionCard title="Messages">
      <div className="py-16 text-center">
        <div className="size-14 rounded-full bg-parent/10 text-parent grid place-items-center mx-auto"><MessagesSquare className="size-6" /></div>
        <div className="mt-3 font-semibold">No new messages</div>
        <div className="text-sm text-muted-foreground">Messages from teachers will appear here.</div>
        <Button className="mt-4">Compose message</Button>
      </div>
    </SectionCard>
  );
}
