import { Plus, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { teachers } from "@/data/mock";

export default function AdminTeachers() {
  return (
    <SectionCard
      title="All Teachers"
      description={`${teachers.length} active staff members`}
      action={<Button><Plus className="size-4 mr-1.5" /> Add Teacher</Button>}
    >
      <div className="overflow-x-auto -mx-5 px-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
              <th className="text-left font-medium py-3 pr-4">Teacher</th>
              <th className="text-left font-medium py-3 pr-4">Subject</th>
              <th className="text-left font-medium py-3 pr-4">Classes</th>
              <th className="text-left font-medium py-3 pr-4">Email</th>
              <th className="text-left font-medium py-3 pr-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {teachers.map(t => (
              <tr key={t.id} className="border-b border-border last:border-0 hover:bg-secondary/40">
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9"><AvatarFallback className="bg-teacher/15 text-teacher text-xs font-semibold">{t.name.split(" ").map(s=>s[0]).slice(0,2).join("")}</AvatarFallback></Avatar>
                    <span className="font-medium">{t.name}</span>
                  </div>
                </td>
                <td className="py-3 pr-4">{t.subject}</td>
                <td className="py-3 pr-4">{t.classes}</td>
                <td className="py-3 pr-4 text-muted-foreground"><span className="inline-flex items-center gap-1.5"><Mail className="size-3.5" />{t.email}</span></td>
                <td className="py-3 pr-4">
                  <Badge variant="outline" className={t.status === "Active" ? "border-success/30 bg-success/10 text-success" : "border-warning/30 bg-warning/10 text-warning"}>{t.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}
