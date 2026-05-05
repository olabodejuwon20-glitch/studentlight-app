import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { students } from "@/data/mock";
import { toast } from "sonner";

export default function TeacherAttendance() {
  const [present, setPresent] = useState<Record<number, boolean>>(() => Object.fromEntries(students.map(s => [s.id, true])));
  const presentCount = Object.values(present).filter(Boolean).length;

  return (
    <SectionCard
      title="Today's Attendance"
      description={`${presentCount} of ${students.length} students marked present`}
      action={
        <div className="flex items-center gap-2">
          <Select defaultValue="ss2a">
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ss2a">SS2 A</SelectItem><SelectItem value="ss1b">SS1 B</SelectItem><SelectItem value="ss3a">SS3 A</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => toast.success("Attendance saved")}>Save</Button>
        </div>
      }
    >
      <ul className="divide-y divide-border">
        {students.map(s => (
          <li key={s.id} className="py-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{s.name}</div>
              <div className="text-xs text-muted-foreground">{s.admission} · {s.class}</div>
            </div>
            <span className={`text-xs font-medium ${present[s.id] ? "text-success" : "text-destructive"}`}>{present[s.id] ? "Present" : "Absent"}</span>
            <Switch checked={present[s.id]} onCheckedChange={v => setPresent(p => ({...p, [s.id]: v}))} />
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}
