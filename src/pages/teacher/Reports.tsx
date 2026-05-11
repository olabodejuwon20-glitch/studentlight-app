import { useEffect, useState } from "react";
import { FileBarChart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, CartesianGrid, Tooltip } from "recharts";

export default function TeacherReports() {
  const { school, user } = useSchool();
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    if (!school || !user) return;
    (async () => {
      const { data: cls } = await supabase.from("classes").select("id,name").eq("school_id", school.id).eq("teacher_id", user.id);
      if (!cls?.length) return;
      const { data: rs } = await supabase.from("results").select("score,subject,student_id").eq("school_id", school.id).eq("teacher_id", user.id);
      const bySubj: Record<string, number[]> = {};
      (rs ?? []).forEach(r => { (bySubj[r.subject] ||= []).push(Number(r.score)); });
      setData(Object.entries(bySubj).map(([subject, arr]) => ({ subject, avg: Math.round(arr.reduce((a,b)=>a+b,0)/arr.length) })));
    })();
  }, [school, user]);

  return (
    <SectionCard title="Class performance — average per subject">
      {data.length === 0 ? <EmptyState icon={FileBarChart} title="No results recorded yet" desc="Average scores per subject will appear once you grade students." /> :
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="subject" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis domain={[0,100]} stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
              <Bar dataKey="avg" fill="hsl(var(--teacher))" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>}
    </SectionCard>
  );
}