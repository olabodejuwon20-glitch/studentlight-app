import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSchool } from "@/contexts/SchoolContext";

/** Permission catalog shown as toggles on the Roles page and enforced in the admin portal.
 *  Keys for page-level permissions intentionally match the route segment used in App.tsx
 *  and the `to` field in the admin sidebar so we can filter both with one set. */
export type PermissionKey = string;

export interface PermissionItem {
  key: PermissionKey;
  label: string;
  description?: string;
}
export interface PermissionGroup {
  label: string;
  items: PermissionItem[];
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: "People",
    items: [
      { key: "students", label: "View students" },
      { key: "teachers", label: "View teachers" },
      { key: "parents", label: "View parents" },
      { key: "invites", label: "Generate invite codes" },
      { key: "bulk", label: "Bulk upload members" },
      { key: "enrollments", label: "Manage admissions" },
    ],
  },
  {
    label: "Academics",
    items: [
      { key: "classes", label: "Classes" },
      { key: "timetable", label: "Timetable" },
      { key: "attendance", label: "Attendance" },
      { key: "lesson-notes", label: "Lesson notes (approve)" },
      { key: "question-bank", label: "Question bank" },
      { key: "library", label: "Library" },
      { key: "proctoring", label: "Proctoring" },
      { key: "reports", label: "Reports" },
    ],
  },
  {
    label: "Examinations",
    items: [
      { key: "trad-exams", label: "Traditional Exams", description: "Plan exam sessions, build timetables, view papers" },
      { key: "action:approve_trad_exam", label: "Action — approve exam papers" },
    ],
  },
  {
    label: "Finance",
    items: [
      { key: "fees", label: "Fees & payments" },
      { key: "subscription", label: "Subscription & billing" },
      { key: "action:edit_fees", label: "Action — edit fee structure" },
    ],
  },
  {
    label: "Operations",
    items: [
      { key: "hostel", label: "Hostel" },
      { key: "transport", label: "Transport" },
      { key: "modules", label: "Modules" },
    ],
  },
  {
    label: "Communication",
    items: [
      { key: "announcements", label: "Announcements" },
      { key: "inbox", label: "Inbox" },
      { key: "parent-alerts", label: "Parent alerts" },
      { key: "action:send_announcement", label: "Action — publish announcements" },
    ],
  },
  {
    label: "AI & Insights",
    items: [
      { key: "copilot", label: "Principal Copilot" },
      { key: "knowledge", label: "Knowledge base" },
      { key: "ai-activity", label: "AI activity" },
      { key: "ai-settings", label: "AI settings" },
    ],
  },
  {
    label: "System",
    items: [
      { key: "settings", label: "School settings" },
      { key: "onboarding", label: "Onboarding wizard" },
      { key: "roles", label: "Manage role slots" },
    ],
  },
];

export const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(g => g.items.map(i => i.key));

export interface RoleSlot {
  slot: number;
  name: string;
  enabled: boolean;
  permissions: PermissionKey[];
}

/** Hook the admin portal uses to decide which pages / actions are visible.
 *  A full admin (no admin_slot on their membership) has unrestricted access.
 *  A slotted admin only sees permissions listed on their slot. */
export function useAdminPermissions() {
  const { school, memberships, user, activeRole } = useSchool();
  const membership = school
    ? memberships.find(m => m.school_id === school.id && m.role === "admin")
    : null;
  const slot = membership?.admin_slot ?? null;
  const isFullAdmin = activeRole === "admin" && (slot === null || slot === undefined);

  const [slotRow, setSlotRow] = useState<RoleSlot | null>(null);
  const [loading, setLoading] = useState(!!slot);

  useEffect(() => {
    let cancelled = false;
    if (!school || !slot || !user) { setSlotRow(null); setLoading(false); return; }
    setLoading(true);
    supabase
      .from("admin_role_slots")
      .select("slot,name,enabled,permissions")
      .eq("school_id", school.id)
      .eq("slot", slot)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setSlotRow(data ? { ...(data as any), permissions: (data as any).permissions ?? [] } : null);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [school?.id, slot, user?.id]);

  const allowed = new Set<string>(isFullAdmin ? ALL_PERMISSION_KEYS : (slotRow?.permissions ?? []));
  const can = (key: PermissionKey) => isFullAdmin || allowed.has(key);

  return { isFullAdmin, slot, slotRow, allowed, can, loading };
}
