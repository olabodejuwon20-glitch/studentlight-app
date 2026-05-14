import { useEffect, useState } from "react";
import { PencilRuler } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";

export default function Grading() {
  const { school, user } = useSchool();
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    if (!school || !user) return;
    (async () => {
      const { data: exams } = await supabase.from("exams").select("id,title,mode").eq("school_id", school.id).eq("created_by", user.id).neq("mode", "practice");
      if (!exams?.length) return setRows([]);
      const { data: attempts } = await supabase.from("exam_attempts").select("id,student_id,score,submitted_at,exam_id").in("exam_id", exams.map(e => e.id)).not("submitted_at", "is", null);
      const eMap: Record<string, string> = {}; exams.forEach(e => eMap[e.id] = e.title);
      setRows((attempts ?? []).map(a => ({ ...a, examTitle: eMap[a.exam_id] })));
    })();
  }, [school, user]);
  return (
    <SectionCard title="Submissions">
      {rows.length === 0 ? <EmptyState icon={PencilRuler} title="No submissions yet" /> :
        <table className="w-full text-sm">
          <thead><tr className="text-xs uppercase text-muted-foreground border-b border-border">
            <th className="text-left font-medium py-3">Exam</th><th className="text-left font-medium py-3">Student</th>
            <th className="text-left font-medium py-3">Score</th><th className="text-left font-medium py-3">Submitted</th>
          </tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b border-border last:border-0">
                <td className="py-3">{r.examTitle}</td>
                <td className="py-3 text-muted-foreground font-mono text-xs">{r.student_id.slice(0,8)}</td>
                <td className="py-3 font-semibold">{r.score ?? "—"}</td>
                <td className="py-3 text-muted-foreground">{new Date(r.submitted_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>}
    </SectionCard>
  );
}
