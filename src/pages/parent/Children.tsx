import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const children = [
  { name: "John Doe",  class: "SS2 A",  performance: 85, attendance: 92, status: "Active" },
  { name: "Mary Doe",  class: "JSS 2 B", performance: 78, attendance: 95, status: "Active" },
];

export default function ParentChildren() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {children.map(c => (
        <div key={c.name} className="rounded-xl bg-card border border-border p-6 shadow-card">
          <div className="flex items-center gap-4">
            <Avatar className="size-16"><AvatarFallback className="bg-parent/15 text-parent font-bold">{c.name.split(" ").map(p=>p[0]).join("")}</AvatarFallback></Avatar>
            <div className="flex-1">
              <div className="font-display font-semibold text-lg">{c.name}</div>
              <div className="text-xs text-muted-foreground">{c.class}</div>
              <Badge variant="outline" className="mt-1 border-success/30 bg-success/10 text-success">{c.status}</Badge>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">Performance</div><div className="text-lg font-display font-bold">{c.performance}%</div></div>
            <div className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">Attendance</div><div className="text-lg font-display font-bold">{c.attendance}%</div></div>
          </div>
          <Button variant="secondary" className="w-full mt-4">View profile</Button>
        </div>
      ))}
    </div>
  );
}
