import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, Plus, Trash2, Sparkles, Upload, Save, ScrollText, ImagePlus, GripVertical, FileText, CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { schoolPath } from "@/lib/tenant";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { TradExam, TradQuestion, TradSection, TradUpload } from "@/lib/tradExams";
import { DRAFT_STATUS_TONE, TRAD_BUCKET, formatStatus, signedUrlForAsset } from "@/lib/tradExams";

export default function AdminTradExamPaper() {
  const { examId } = useParams<{ examId: string }>();
  const { school } = useSchool();
  const [exam, setExam] = useState<TradExam | null>(null);
  const [sections, setSections] = useState<TradSection[]>([]);
  const [questions, setQuestions] = useState<TradQuestion[]>([]);
  const [uploads, setUploads] = useState<TradUpload[]>([]);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!examId) return;
    const [e, s, q, u] = await Promise.all([
      supabase.from("trad_exams" as any).select("*").eq("id", examId).maybeSingle(),
      supabase.from("trad_exam_sections" as any).select("*").eq("exam_id", examId).order("position"),
      supabase.from("trad_exam_questions" as any).select("*").eq("exam_id", examId).order("position"),
      supabase.from("trad_exam_uploads" as any).select("*").eq("exam_id", examId).order("created_at", { ascending: false }),
    ]);
    setExam((e.data as any) ?? null);
    setSections(((s.data as any) ?? []) as TradSection[]);
    setQuestions(((q.data as any) ?? []) as TradQuestion[]);
    setUploads(((u.data as any) ?? []) as TradUpload[]);
  }
  useEffect(() => { load(); }, [examId]);

  async function saveExamMeta(patch: Partial<TradExam>) {
    if (!examId || !exam) return;
    setExam({ ...exam, ...patch } as TradExam);
    setSaving(true);
    const { error } = await supabase.from("trad_exams" as any).update(patch as any).eq("id", examId);
    setSaving(false);
    if (error) toast.error(error.message);
  }

  async function addSection() {
    if (!school || !examId) return;
    const position = sections.length;
    const label = position === 0 ? "Section A" : `Section ${String.fromCharCode(65 + position)}`;
    const { error } = await supabase.from("trad_exam_sections" as any).insert({
      school_id: school.id, exam_id: examId, label, position,
    });
    if (error) return toast.error(error.message);
    load();
  }

  async function removeSection(id: string) {
    if (!confirm("Remove section? Questions inside will become unsectioned.")) return;
    const { error } = await supabase.from("trad_exam_sections" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  }

  async function addQuestion(type: "mcq" | "theory", sectionId: string | null) {
    if (!school || !examId) return;
    const position = questions.length;
    const base: any = {
      school_id: school.id, exam_id: examId, section_id: sectionId, position, type,
      prompt: "New question", marks: type === "mcq" ? 1 : 5,
    };
    if (type === "mcq") {
      base.options = ["", "", "", ""];
      base.correct_index = 0;
    }
    const { error } = await supabase.from("trad_exam_questions" as any).insert(base);
    if (error) return toast.error(error.message);
    load();
  }

  async function updateQuestion(id: string, patch: Partial<TradQuestion>) {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...patch } as TradQuestion : q));
    const { error } = await supabase.from("trad_exam_questions" as any).update(patch as any).eq("id", id);
    if (error) toast.error(error.message);
  }

  async function removeQuestion(id: string) {
    if (!confirm("Delete this question?")) return;
    const { error } = await supabase.from("trad_exam_questions" as any).delete().eq("id", id);
    if (error) return toast.error(error.message);
    setQuestions(prev => prev.filter(q => q.id !== id));
  }

  async function submitForApproval() {
    if (!examId) return;
    await saveExamMeta({ draft_status: "submitted" });
    toast.success("Submitted for approval");
  }

  const totalMarksComputed = useMemo(
    () => questions.reduce((s, q) => s + (q.marks || 0), 0),
    [questions]
  );

  if (!exam) {
    return <div className="text-sm text-muted-foreground">Loading paper…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild>
          <Link to={schoolPath(school?.slug, `/app/admin/trad-exams`)}>
            <ArrowLeft className="size-4 mr-1" /> Back
          </Link>
        </Button>
      </div>

      {/* Paper meta */}
      <SectionCard
        title={
          <div className="flex items-center gap-2 flex-wrap">
            <ScrollText className="size-5 text-primary" />
            <span>{exam.title}</span>
            <Badge variant="outline" className={DRAFT_STATUS_TONE[exam.draft_status]}>
              {formatStatus(exam.draft_status)}
            </Badge>
            {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
          </div>
        }
        description={`Total marks (computed): ${totalMarksComputed}`}
        action={
          <div className="flex items-center gap-2">
            {exam.draft_status === "draft" && (
              <Button onClick={submitForApproval}>
                <CheckCircle2 className="size-4 mr-1.5" /> Submit for approval
              </Button>
            )}
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Label>Title</Label>
            <Input value={exam.title} onChange={e => setExam({ ...exam, title: e.target.value })}
              onBlur={e => saveExamMeta({ title: e.target.value })} />
          </div>
          <div>
            <Label>Exam type</Label>
            <Select value={exam.exam_type} onValueChange={(v: any) => saveExamMeta({ exam_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mcq">MCQ only</SelectItem>
                <SelectItem value="theory">Theory only</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3">
            <Label>Instructions to students</Label>
            <Textarea rows={3} value={exam.instructions ?? ""}
              onChange={e => setExam({ ...exam, instructions: e.target.value })}
              onBlur={e => saveExamMeta({ instructions: e.target.value })}
              placeholder="Answer ALL questions in Section A. Choose any FOUR from Section B." />
          </div>
        </div>
      </SectionCard>

      <Tabs defaultValue="manual">
        <TabsList>
          <TabsTrigger value="manual">Build questions</TabsTrigger>
          <TabsTrigger value="upload">Upload &amp; AI-extract</TabsTrigger>
        </TabsList>

        <TabsContent value="manual" className="space-y-4 pt-4">
          <SectionCard
            title="Sections"
            description="Break the paper into sections (e.g. Section A — Objectives, Section B — Theory)."
            action={<Button size="sm" variant="outline" onClick={addSection}><Plus className="size-3.5 mr-1" />Add section</Button>}
          >
            {sections.length === 0 ? (
              <EmptyState icon={FileText} title="No sections" desc="Optional — add a section before creating questions, or add questions directly." />
            ) : (
              <div className="space-y-2">
                {sections.map(s => (
                  <SectionRow key={s.id} section={s} onRemove={() => removeSection(s.id)} onChange={(patch) => {
                    setSections(prev => prev.map(x => x.id === s.id ? { ...x, ...patch } : x));
                    supabase.from("trad_exam_sections" as any).update(patch as any).eq("id", s.id);
                  }} />
                ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            title="Questions"
            description={`${questions.length} question${questions.length === 1 ? "" : "s"}`}
            action={
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => addQuestion("mcq", null)}>
                  <Plus className="size-3.5 mr-1" />MCQ
                </Button>
                <Button size="sm" variant="outline" onClick={() => addQuestion("theory", null)}>
                  <Plus className="size-3.5 mr-1" />Theory
                </Button>
              </div>
            }
          >
            {questions.length === 0 ? (
              <EmptyState icon={ScrollText} title="No questions yet"
                desc="Add MCQ or theory questions manually, or use the Upload tab to extract them from a PDF/Word file with AI." />
            ) : (
              <div className="space-y-3">
                {questions.map((q, i) => (
                  <QuestionCard key={q.id} q={q} index={i} sections={sections}
                    onChange={(p) => updateQuestion(q.id, p)}
                    onRemove={() => removeQuestion(q.id)}
                    examId={examId!} schoolId={school!.id} />
                ))}
              </div>
            )}
          </SectionCard>
        </TabsContent>

        <TabsContent value="upload" className="space-y-4 pt-4">
          <UploadPanel examId={examId!} schoolId={school!.id} uploads={uploads} onChanged={load} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SectionRow({ section, onChange, onRemove }: {
  section: TradSection; onChange: (p: Partial<TradSection>) => void; onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card/50">
      <GripVertical className="size-4 text-muted-foreground" />
      <Input value={section.label} onChange={e => onChange({ label: e.target.value })} className="max-w-xs" />
      <Input value={section.instructions ?? ""} onChange={e => onChange({ instructions: e.target.value })}
        placeholder="Section instructions (optional)" />
      <Button size="icon" variant="ghost" onClick={onRemove}><Trash2 className="size-4 text-destructive" /></Button>
    </div>
  );
}

function QuestionCard({ q, index, sections, onChange, onRemove, examId, schoolId }: {
  q: TradQuestion; index: number; sections: TradSection[];
  onChange: (p: Partial<TradQuestion>) => void;
  onRemove: () => void;
  examId: string; schoolId: string;
}) {
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    if (q.image_path) {
      signedUrlForAsset(q.image_path).then(u => { if (!cancelled) setImgUrl(u); });
    } else {
      setImgUrl(null);
    }
    return () => { cancelled = true; };
  }, [q.image_path]);

  async function uploadImage(file: File) {
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${schoolId}/${examId}/q-${q.id}.${ext}`;
    const { error } = await supabase.storage.from(TRAD_BUCKET).upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    onChange({ image_path: path });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Q{index + 1}</Badge>
          <Badge variant="secondary">{q.type === "mcq" ? "MCQ" : "Theory"}</Badge>
          {q.ai_generated && <Badge variant="outline" className="bg-violet-500/15 text-violet-700 dark:text-violet-300">
            <Sparkles className="size-3 mr-1" />AI
          </Badge>}
        </div>
        <div className="flex items-center gap-2">
          <Select value={q.section_id ?? "none"} onValueChange={v => onChange({ section_id: v === "none" ? null : v })}>
            <SelectTrigger className="h-8 w-[140px] text-xs"><SelectValue placeholder="No section" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No section</SelectItem>
              {sections.map(s => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="number" className="h-8 w-20" min={0} value={q.marks}
            onChange={e => onChange({ marks: Number(e.target.value) })} />
          <span className="text-xs text-muted-foreground">marks</span>
          <Button size="icon" variant="ghost" onClick={onRemove}><Trash2 className="size-4 text-destructive" /></Button>
        </div>
      </div>

      <div className="mt-3">
        <Label>Prompt</Label>
        <Textarea rows={2} value={q.prompt} onChange={e => onChange({ prompt: e.target.value })} />
      </div>

      {q.type === "mcq" && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(q.options ?? ["", "", "", ""]).map((opt, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange({ correct_index: idx })}
                className={
                  "size-7 rounded-full border grid place-items-center text-xs font-semibold transition " +
                  (q.correct_index === idx
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "border-border hover:border-primary")
                }
                title="Mark as correct answer"
              >
                {String.fromCharCode(65 + idx)}
              </button>
              <Input value={opt} onChange={e => {
                const next = [...(q.options ?? ["", "", "", ""])];
                next[idx] = e.target.value;
                onChange({ options: next });
              }} placeholder={`Option ${String.fromCharCode(65 + idx)}`} />
            </div>
          ))}
        </div>
      )}

      {q.type === "theory" && (
        <div className="mt-3">
          <Label>Model answer (private)</Label>
          <Textarea rows={2} value={q.model_answer ?? ""} onChange={e => onChange({ model_answer: e.target.value })}
            placeholder="Marking scheme / model answer — not shown to students" />
        </div>
      )}

      <div className="mt-3 flex items-start gap-3">
        <div>
          <input ref={fileRef} type="file" accept="image/*" hidden
            onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0])} />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            <ImagePlus className="size-3.5 mr-1" />
            {q.image_path ? "Replace diagram" : "Add diagram"}
          </Button>
        </div>
        {imgUrl && (
          <img src={imgUrl} alt="Question diagram" className="max-h-32 rounded-md border border-border" />
        )}
      </div>
    </div>
  );
}

function UploadPanel({ examId, schoolId, uploads, onChanged }: {
  examId: string; schoolId: string; uploads: TradUpload[]; onChanged: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    if (!file) return;
    setBusy(true);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${schoolId}/${examId}/source-${Date.now()}-${safe}`;
      const { error: upErr } = await supabase.storage.from(TRAD_BUCKET).upload(path, file, { upsert: false });
      if (upErr) throw upErr;
      const { data: row, error: rowErr } = await supabase.from("trad_exam_uploads" as any).insert({
        school_id: schoolId, exam_id: examId,
        file_path: path, file_name: file.name, mime: file.type,
        status: "parsing",
      }).select("id").maybeSingle();
      if (rowErr) throw rowErr;
      toast.success("Uploaded — extracting questions with AI…");
      const { error: fnErr } = await supabase.functions.invoke("parse-trad-exam-doc", {
        body: { upload_id: (row as any).id },
      });
      if (fnErr) throw fnErr;
      toast.success("AI extraction complete. Review the questions below.");
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setBusy(false);
      onChanged();
    }
  }

  return (
    <SectionCard
      title="Upload an exam paper"
      description="Drop a PDF or Word document. AI will extract MCQ and theory questions for you to review."
      action={
        <>
          <input ref={fileRef} type="file" hidden accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
          <Button onClick={() => fileRef.current?.click()} disabled={busy}>
            <Upload className="size-4 mr-1.5" />
            {busy ? "Processing…" : "Upload PDF / Word"}
          </Button>
        </>
      }
    >
      {uploads.length === 0 ? (
        <EmptyState icon={Sparkles} title="No uploads yet"
          desc="Upload a past paper or your draft document and AI will turn it into editable questions." />
      ) : (
        <div className="space-y-2">
          {uploads.map(u => (
            <div key={u.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{u.file_name ?? u.file_path}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(u.created_at).toLocaleString()}
                  {u.error ? ` · ${u.error}` : ""}
                </div>
              </div>
              <Badge variant="outline" className={
                u.status === "parsed" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                : u.status === "failed" ? "bg-red-500/15 text-red-700 dark:text-red-300"
                : "bg-amber-500/15 text-amber-700 dark:text-amber-300"
              }>
                {formatStatus(u.status)}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}