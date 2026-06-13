import { useEffect, useMemo, useState, useCallback } from "react";
import { Search, UserSquare2, Link2, Trash2, Plus, BadgeCheck, Mail, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cacheGet, cacheSet } from "@/lib/dataCache";
import { publicEmail, publicEmailForSearch, publicInitials, publicContact } from "@/lib/identity";

type Member = {
  user_id: string;
  created_at: string;
  bio_completed: boolean;
  profile_data: any;
  full_name?: string;
  email?: string;
  phone?: string;
  photo_url?: string;
};

type Link = {
  id: string;
  parent_user_id: string;
  student_user_id: string;
  relationship: string;
  is_primary: boolean;
  receives_fees: boolean;
  receives_results: boolean;
  receives_attendance: boolean;
  receives_behavior: boolean;
  can_pickup: boolean;
  phone_e164: string | null;
};

const RELATIONSHIPS = ["mother", "father", "guardian", "sponsor", "other"] as const;

export default function AdminParents() {
  const { school } = useSchool();
  const cachedParents  = school ? cacheGet<Member[]>(`members:${school.id}:parent`)  : null;
  const cachedStudents = school ? cacheGet<Member[]>(`members:${school.id}:student`) : null;
  const cachedLinks    = school ? cacheGet<Link[]>(`parent_links:${school.id}`)      : null;
  const hasCache = !!(cachedParents && cachedStudents && cachedLinks);
  const [parents, setParents] = useState<Member[]>(cachedParents ?? []);
  const [students, setStudents] = useState<Member[]>(cachedStudents ?? []);
  const [links, setLinks] = useState<Link[]>(cachedLinks ?? []);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Member | null>(null);
  const [linkDialog, setLinkDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(!hasCache);

  const loadAll = useCallback(async () => {
    if (!school) return;
    if (!cacheGet(`members:${school.id}:parent`)) setIsLoading(true);
    try {
    const [pRes, sRes, lRes] = await Promise.all([
      supabase.rpc("admin_list_memberships_with_profile", { _school: school.id, _role: "parent" as any }),
      supabase.rpc("admin_list_memberships_with_profile", { _school: school.id, _role: "student" as any }),
      supabase.from("parent_links").select("*").eq("school_id", school.id),
    ]);

    const merge = async (rows: any[] | null): Promise<Member[]> => {
      if (!rows?.length) return [];
      const ids = rows.map((x) => x.user_id);
      const { data: profiles } = await supabase
        .from("profiles").select("id,full_name,email,phone,photo_url").in("id", ids);
      const byId: Record<string, any> = {};
      profiles?.forEach((p) => (byId[p.id] = p));
      return rows.map((x) => ({ ...x, ...(byId[x.user_id] || {}) }));
    };

    const mParents = await merge(pRes.data);
    const mStudents = await merge(sRes.data);
    const mLinks = (lRes.data || []) as Link[];
    setParents(mParents);
    setStudents(mStudents);
    setLinks(mLinks);
    cacheSet(`members:${school.id}:parent`, mParents);
    cacheSet(`members:${school.id}:student`, mStudents);
    cacheSet(`parent_links:${school.id}`, mLinks);
    } finally {
      setIsLoading(false);
    }
  }, [school]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const linksByParent = useMemo(() => {
    const m: Record<string, Link[]> = {};
    for (const l of links) (m[l.parent_user_id] ||= []).push(l);
    return m;
  }, [links]);

  const studentsById = useMemo(() => {
    const m: Record<string, Member> = {};
    for (const s of students) m[s.user_id] = s;
    return m;
  }, [students]);

  const filtered = useMemo(() => {
    if (!q.trim()) return parents;
    const s = q.toLowerCase();
    return parents.filter((r) =>
      (r.full_name || "").toLowerCase().includes(s) ||
      publicEmailForSearch(r.email).toLowerCase().includes(s) ||
      (r.phone || "").toLowerCase().includes(s)
    );
  }, [parents, q]);

  async function unlink(linkId: string) {
    const { error } = await supabase.from("parent_links").delete().eq("id", linkId);
    if (error) return toast.error(error.message);
    toast.success("Child unlinked");
    setLinks((arr) => arr.filter((l) => l.id !== linkId));
  }

  return (
    <SectionCard
      title="Parents"
      description={isLoading ? "Loading…" : `${parents.length} registered · ${links.length} child link${links.length === 1 ? "" : "s"}`}
    >
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 flex items-start gap-3">
              <div className="size-11 rounded-full animate-pulse bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 animate-pulse bg-muted rounded" />
                <div className="h-3 w-1/2 animate-pulse bg-muted rounded" />
                <div className="h-3 w-1/3 animate-pulse bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : parents.length === 0 ? (
        <EmptyState
          icon={UserSquare2}
          title="No parents yet"
          desc="Invite parents via the Invites page or have them join with a parent code. Once a parent registers, link them to their children here."
        />
      ) : (
        <>
          <div className="relative mb-4 max-w-md">
            <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search parents by name, email, phone…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((p) => {
              const name = p.full_name || "Unnamed parent";
              const initials = publicInitials(p);
              const kids = linksByParent[p.user_id] || [];
              return (
                <button
                  key={p.user_id}
                  onClick={() => setSelected(p)}
                  className="text-left rounded-xl border border-border bg-card hover:bg-secondary/40 hover:border-primary/40 transition-colors p-4 flex items-start gap-3"
                >
                  <Avatar className="size-11 shrink-0">
                    {p.photo_url && <AvatarImage src={p.photo_url} alt={name} />}
                    <AvatarFallback className="text-sm font-medium bg-parent/15 text-parent">{initials || "?"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{name}</div>
                    <div className="text-xs text-muted-foreground truncate">{publicContact(p) || "—"}</div>
                    <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                      <Badge variant="secondary" className="text-[10px]">
                        {kids.length} child{kids.length === 1 ? "" : "ren"}
                      </Badge>
                      {p.bio_completed
                        ? <span className="text-[10px] text-success inline-flex items-center gap-0.5"><BadgeCheck className="size-3" /> Verified</span>
                        : <span className="text-[10px] text-warning">Profile incomplete</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">No matches for "{q}".</div>
          )}
        </>
      )}

      {/* Parent detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.full_name || "Parent"}</DialogTitle>
            <DialogDescription>Manage linked children for this parent.</DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                {publicEmail(selected.email) && (
                  <div className="flex items-center gap-2 text-muted-foreground"><Mail className="size-3.5" /> {publicEmail(selected.email)}</div>
                )}
                {selected.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground"><Phone className="size-3.5" /> {selected.phone}</div>
                )}
              </div>

              <div className="rounded-lg border border-border">
                <div className="flex items-center justify-between p-3 border-b border-border">
                  <div className="font-semibold text-sm">Linked children</div>
                  <Button size="sm" onClick={() => setLinkDialog(true)}>
                    <Plus className="size-4 mr-1" /> Link child
                  </Button>
                </div>
                <div className="divide-y divide-border">
                  {(linksByParent[selected.user_id] || []).length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-6">No children linked yet.</div>
                  )}
                  {(linksByParent[selected.user_id] || []).map((l) => {
                    const child = studentsById[l.student_user_id];
                    const name = child?.full_name || "Unknown student";
                    return (
                      <div key={l.id} className="flex items-center gap-3 p-3">
                        <Avatar className="size-9">
                          {child?.photo_url && <AvatarImage src={child.photo_url} />}
                          <AvatarFallback className="text-xs bg-student/15 text-student">
                            {(name).split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium truncate">{name}</div>
                          <div className="text-[11px] text-muted-foreground flex flex-wrap gap-1.5 mt-0.5">
                            <Badge variant="outline" className="capitalize text-[10px]">{l.relationship}</Badge>
                            {l.is_primary && <Badge className="text-[10px]">Primary</Badge>}
                            {!l.receives_fees && <Badge variant="secondary" className="text-[10px]">No fees</Badge>}
                            {!l.receives_results && <Badge variant="secondary" className="text-[10px]">No results</Badge>}
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => unlink(l.id)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Link child dialog */}
      {selected && (
        <LinkChildDialog
          open={linkDialog}
          onClose={() => setLinkDialog(false)}
          parent={selected}
          students={students}
          existingChildIds={new Set((linksByParent[selected.user_id] || []).map((l) => l.student_user_id))}
          schoolId={school?.id || ""}
          onLinked={(l) => { setLinks((arr) => [...arr, l]); setLinkDialog(false); }}
        />
      )}
    </SectionCard>
  );
}

function LinkChildDialog({
  open, onClose, parent, students, existingChildIds, schoolId, onLinked,
}: {
  open: boolean;
  onClose: () => void;
  parent: Member;
  students: Member[];
  existingChildIds: Set<string>;
  schoolId: string;
  onLinked: (l: Link) => void;
}) {
  const [studentId, setStudentId] = useState("");
  const [relationship, setRelationship] = useState<(typeof RELATIONSHIPS)[number]>("guardian");
  const [isPrimary, setIsPrimary] = useState(false);
  const [recFees, setRecFees] = useState(true);
  const [recResults, setRecResults] = useState(true);
  const [recAttendance, setRecAttendance] = useState(true);
  const [recBehavior, setRecBehavior] = useState(true);
  const [canPickup, setCanPickup] = useState(true);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (open) {
      setStudentId(""); setRelationship("guardian"); setIsPrimary(false);
      setRecFees(true); setRecResults(true); setRecAttendance(true);
      setRecBehavior(true); setCanPickup(true); setQ("");
    }
  }, [open]);

  const available = useMemo(() => {
    const s = q.toLowerCase();
    return students
      .filter((st) => !existingChildIds.has(st.user_id))
      .filter((st) => !s || (st.full_name || "").toLowerCase().includes(s) || (st.email || "").toLowerCase().includes(s));
  }, [students, existingChildIds, q]);

  async function save() {
    if (!studentId) return toast.error("Pick a student");
    setSaving(true);
    const { data, error } = await supabase.from("parent_links").insert({
      school_id: schoolId,
      parent_user_id: parent.user_id,
      student_user_id: studentId,
      relationship,
      is_primary: isPrimary,
      receives_fees: recFees,
      receives_results: recResults,
      receives_attendance: recAttendance,
      receives_behavior: recBehavior,
      can_pickup: canPickup,
      phone_e164: parent.phone || null,
    }).select("*").single();
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Child linked");
    onLinked(data as Link);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link a child</DialogTitle>
          <DialogDescription>
            Link {parent.full_name || parent.email} to a student. The parent will gain access to that child's records.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label className="text-xs">Student</Label>
            <Input
              placeholder="Search students…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="mt-1"
            />
            <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border divide-y divide-border">
              {available.length === 0 && (
                <div className="text-center text-xs text-muted-foreground py-4">No students available.</div>
              )}
              {available.map((st) => {
                const name = st.full_name || st.email || "Unnamed";
                const initials = name.split(/\s+/).slice(0, 2).map((s) => s[0]?.toUpperCase()).join("");
                const active = studentId === st.user_id;
                return (
                  <button
                    key={st.user_id}
                    onClick={() => setStudentId(st.user_id)}
                    className={`w-full text-left flex items-center gap-2 p-2 ${active ? "bg-primary/10" : "hover:bg-secondary/40"}`}
                  >
                    <Avatar className="size-7">
                      {st.photo_url && <AvatarImage src={st.photo_url} />}
                      <AvatarFallback className="text-[10px] bg-student/15 text-student">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{st.profile_data?.grade_level || st.email || "—"}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label className="text-xs">Relationship</Label>
            <Select value={relationship} onValueChange={(v) => setRelationship(v as any)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-2">
            <ToggleRow label="Primary contact" checked={isPrimary} onChange={setIsPrimary} />
            <ToggleRow label="Can pick up child" checked={canPickup} onChange={setCanPickup} />
            <ToggleRow label="Receives fee notifications" checked={recFees} onChange={setRecFees} />
            <ToggleRow label="Receives results" checked={recResults} onChange={setRecResults} />
            <ToggleRow label="Receives attendance updates" checked={recAttendance} onChange={setRecAttendance} />
            <ToggleRow label="Receives behavior notes" checked={recBehavior} onChange={setRecBehavior} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={save} disabled={!studentId || saving}>
            <Link2 className="size-4 mr-1" /> {saving ? "Linking…" : "Link child"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (b: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-xs cursor-pointer">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}