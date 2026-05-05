import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { toast } from "sonner";

export default function AdminSettings() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <SectionCard title="School Profile" className="lg:col-span-2">
        <form className="grid grid-cols-1 sm:grid-cols-2 gap-4" onSubmit={e => { e.preventDefault(); toast.success("Settings saved"); }}>
          <div><Label>School name</Label><Input defaultValue="Greenfield Academy" /></div>
          <div><Label>School ID</Label><Input defaultValue="SCH-2025-001" disabled /></div>
          <div><Label>Email</Label><Input type="email" defaultValue="admin@greenfield.edu" /></div>
          <div><Label>Phone</Label><Input defaultValue="+234 800 000 0000" /></div>
          <div className="sm:col-span-2"><Label>Address</Label><Input defaultValue="12 Education Avenue, Lagos, Nigeria" /></div>
          <div className="sm:col-span-2 flex justify-end"><Button type="submit">Save changes</Button></div>
        </form>
      </SectionCard>
      <SectionCard title="Preferences">
        <ul className="divide-y divide-border">
          {[
            { label: "Email notifications", desc: "Receive updates by email" },
            { label: "Weekly digest", desc: "Summary every Monday" },
            { label: "Two-factor auth", desc: "Stronger admin security" },
            { label: "Auto-approve enrollments", desc: "Skip manual review" },
          ].map((p, i) => (
            <li key={i} className="py-3 flex items-center justify-between gap-3">
              <div><div className="text-sm font-medium">{p.label}</div><div className="text-xs text-muted-foreground">{p.desc}</div></div>
              <Switch defaultChecked={i < 2} />
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
