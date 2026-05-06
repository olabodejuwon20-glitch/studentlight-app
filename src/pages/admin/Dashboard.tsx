import { useEffect, useState } from "react";
import { Users, GraduationCap, BookOpen, ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { StatCard } from "@/components/dashboard/StatCard";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";

export default function AdminDashboard() {
  const { school } = useSchool();
  const [counts, setCounts] = useState({ students: 0, teachers: 0, classes: 0, attendance: 0 });
  const [recent, setRecent] = useState<any[]>([]);

  useEffect(() => {
    if (!school) return;
    (async () => {
      const sid = school.id;
      const [stu, tea, cls, att] = await Promise.all([
        supabase.from("memberships").select("id", { count: "exact", head: true }).eq("school_id", sid).eq("role", "student"),
        supabase.from("memberships").select("id", { count: "exact", head: true }).eq("school_id", sid).eq("role", "teacher"),
        supabase.from("classes").select("id", { count: "exact", head: true }).eq("school_id", sid),
        supabase.from("attendance").select("status", { count: "exact" }).eq("school_id", sid).eq("status", "present"),
      ]);
      setCounts({
        students: stu.count ?? 0,
        teachers: tea.count ?? 0,
        classes: cls.count ?? 0,
        attendance: att.count ?? 0,
      });
      const { data } = await supabase.from("memberships").select("id,role,created_at,user_id").eq("school_id", sid).order("created_at", { ascending: false }).limit(5);
      setRecent(data ?? []);
    })();
  }, [school]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={String(counts.students)} icon={Users} tone="admin" />
        <StatCard label="Total Teachers" value={String(counts.teachers)} icon={GraduationCap} tone="success" />
        <StatCard label="Active Classes" value={String(counts.classes)} icon={BookOpen} tone="info" />
        <StatCard label="Attendance Records" value={String(counts.attendance)} icon={ClipboardCheck} tone="warning" />
      </div>

      <SectionCard title="Recent Members" description="Latest people joining your school">
        {recent.length === 0
          ? <EmptyState icon={Users} title="No members yet" desc="Generate invite codes to bring people in." />
          : <ul className="divide-y divide-border">
              {recent.map(r => (
                <li key={r.id} className="py-3 flex items-center justify-between text-sm">
                  <span className="font-mono text-xs text-muted-foreground">{r.user_id.slice(0,8)}</span>
                  <span className="capitalize px-2 py-0.5 rounded-full bg-secondary text-xs">{r.role}</span>
                  <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>}
      </SectionCard>
    </div>
  );
}
