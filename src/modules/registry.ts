import {
  LayoutDashboard, Users, GraduationCap, BookOpen, Calendar, Library, BookOpenCheck,
  NotebookPen, Wallet, Building2, Bus, Megaphone, FileBarChart, Ticket, Upload, Settings,
  ClipboardCheck, ClipboardList, BarChart3, Award, Mail, FilePlus2, PencilRuler, MessagesSquare,
  FolderOpen, ListChecks, Sparkles, UserSquare2, Activity, Package,
} from "lucide-react";
import { ModuleManifest } from "./types";

/**
 * In-repo module manifests. Each slug should match a row in public.modules.
 * When a school_modules row exists, `enabled` controls visibility.
 * When no row exists, modules marked `core: true` stay on; others fall back to on as well
 * for backwards compatibility (until super admin starts curating per-school modules).
 */
export const MODULE_MANIFESTS: ModuleManifest[] = [
  // ---- CORE (always on) ----
  {
    slug: "core-dashboard", name: "Dashboard", category: "academics", icon: LayoutDashboard, core: true,
    sidebar: [
      { label: "Dashboard", to: "",         icon: LayoutDashboard, roles: ["admin", "teacher", "student", "parent"] },
    ],
  },

  // ---- ADMIN ops ----
  {
    slug: "school-directory", name: "School Directory", category: "operations", icon: Users, core: true,
    sidebar: [
      { label: "Students",  to: "students",  icon: Users,         roles: ["admin"] },
      { label: "Teachers",  to: "teachers",  icon: GraduationCap, roles: ["admin"] },
      { label: "Classes",   to: "classes",   icon: BookOpen,      roles: ["admin"] },
      { label: "Invites",   to: "invites",   icon: Ticket,        roles: ["admin"] },
      { label: "Bulk Upload", to: "bulk",    icon: Upload,        roles: ["admin"] },
    ],
  },
  {
    slug: "timetable", name: "Timetable", category: "academics", icon: Calendar,
    sidebar: [{ label: "Timetable", to: "timetable", icon: Calendar, roles: ["admin"] }],
  },
  {
    slug: "hostel", name: "Hostel Management", category: "operations", icon: Building2,
    sidebar: [{ label: "Hostel", to: "hostel", icon: Building2, roles: ["admin"] }],
  },
  {
    slug: "transport", name: "Transport", category: "operations", icon: Bus,
    sidebar: [{ label: "Transport", to: "transport", icon: Bus, roles: ["admin"] }],
  },
  {
    slug: "announcements", name: "Announcements", category: "communication", icon: Megaphone, core: true,
    sidebar: [{ label: "Announcements", to: "announcements", icon: Megaphone, roles: ["admin"] }],
  },

  // ---- Academics ----
  {
    slug: "library", name: "Library", category: "academics", icon: Library,
    sidebar: [
      { label: "Library", to: "library", icon: Library, roles: ["admin", "teacher", "student"] },
    ],
  },
  {
    slug: "question-bank", name: "Question Bank", category: "academics", icon: BookOpenCheck,
    sidebar: [{ label: "Question Bank", to: "question-bank", icon: BookOpenCheck, roles: ["admin"] }],
  },
  {
    slug: "lesson-notes", name: "Lesson Notes", category: "academics", icon: NotebookPen,
    sidebar: [
      { label: "Lesson Notes", to: "lesson-notes", icon: NotebookPen, roles: ["admin", "teacher", "student"] },
    ],
  },
  {
    slug: "lesson-plan", name: "Lesson Plans", category: "academics", icon: NotebookPen,
    sidebar: [{ label: "Lesson Plan", to: "lesson-plan", icon: NotebookPen, roles: ["teacher"] }],
  },
  {
    slug: "attendance", name: "Attendance", category: "academics", icon: ClipboardCheck, core: true,
    sidebar: [
      { label: "Attendance", to: "attendance", icon: ClipboardCheck, roles: ["teacher"] },
      { label: "Attendance", to: "attendance", icon: ClipboardCheck, roles: ["parent"] },
    ],
  },
  {
    slug: "assignments", name: "Assignments", category: "academics", icon: ClipboardList,
    sidebar: [
      { label: "Assignments", to: "assignments", icon: ClipboardList, roles: ["teacher", "student"] },
    ],
  },
  {
    slug: "gradebook", name: "Gradebook", category: "academics", icon: BarChart3,
    sidebar: [
      { label: "Gradebook", to: "gradebook", icon: BarChart3, roles: ["teacher", "student"] },
    ],
  },
  {
    slug: "behavior", name: "Behavior & Conduct", category: "academics", icon: Award,
    sidebar: [
      { label: "Behavior", to: "behavior", icon: Award, roles: ["teacher", "student", "parent"] },
    ],
  },

  // ---- CBT / Exams ----
  {
    slug: "cbt", name: "CBT Simulation", category: "academics", icon: ListChecks,
    defaultConfig: {
      webcamProctoring: false,
      aiProctoring: false,
      negativeMarking: false,
      randomizeQuestions: true,
      violationLimit: 3,
      showAnswersAfterEach: false,
      autoSubmitOnTimeout: true,
    },
    sidebar: [
      { label: "Test Builder", to: "tests",   icon: FilePlus2,   roles: ["teacher"] },
      { label: "Grading",      to: "grading", icon: PencilRuler, roles: ["teacher"] },
      { label: "Exams",        to: "exams",   icon: ListChecks,  roles: ["student"] },
      { label: "Results",      to: "results", icon: FileBarChart, roles: ["student", "parent"] },
    ],
  },

  // ---- AI ----
  {
    slug: "ai-tutor", name: "AI Tutor", category: "intelligence", icon: Sparkles,
    sidebar: [{ label: "AI Tutor", to: "ai-tutor", icon: Sparkles, roles: ["student"] }],
  },

  // ---- Finance ----
  {
    slug: "fees", name: "Fees & Payments", category: "finance", icon: Wallet,
    sidebar: [
      { label: "Fees & Payments", to: "fees", icon: Wallet, roles: ["admin", "student", "parent"] },
    ],
  },

  // ---- Communication ----
  {
    slug: "messages", name: "Messaging", category: "communication", icon: MessagesSquare, core: true,
    sidebar: [
      { label: "Messages", to: "messages", icon: MessagesSquare, roles: ["teacher", "student", "parent"] },
    ],
  },
  {
    slug: "parent-comms", name: "Parent Communications", category: "communication", icon: Mail,
    sidebar: [
      { label: "Parent Comms",   to: "parent-comms",  icon: Mail, roles: ["teacher"] },
      { label: "Teacher Comms",  to: "teacher-comms", icon: Mail, roles: ["parent"] },
    ],
  },

  // ---- Teacher-only utilities ----
  {
    slug: "teacher-toolkit", name: "Teacher Toolkit", category: "academics", icon: FolderOpen, core: true,
    sidebar: [
      { label: "My Classes",  to: "classes",   icon: BookOpen,     roles: ["teacher"] },
      { label: "Students",    to: "students",  icon: Users,        roles: ["teacher"] },
      { label: "Resources",   to: "resources", icon: FolderOpen,   roles: ["teacher"] },
      { label: "Reports",     to: "reports",   icon: FileBarChart, roles: ["teacher"] },
    ],
  },

  // ---- Student / parent essentials ----
  {
    slug: "student-essentials", name: "Student Essentials", category: "academics", icon: BookOpen, core: true,
    sidebar: [
      { label: "My Classes", to: "classes",  icon: BookOpen, roles: ["student"] },
      { label: "Calendar",   to: "calendar", icon: Calendar, roles: ["student", "teacher"] },
    ],
  },
  {
    slug: "parent-essentials", name: "Parent Essentials", category: "academics", icon: UserSquare2, core: true,
    sidebar: [
      { label: "My Children",      to: "children", icon: UserSquare2,  roles: ["parent"] },
      { label: "Academic Records", to: "results",  icon: FileBarChart, roles: ["parent"] },
      { label: "Activity Feed",    to: "activity", icon: Activity,     roles: ["parent"] },
      { label: "Calendar",         to: "calendar", icon: Calendar,     roles: ["parent"] },
    ],
  },

  // ---- Admin tail ----
  {
    slug: "admin-reports", name: "Reports", category: "operations", icon: FileBarChart, core: true,
    sidebar: [{ label: "Reports", to: "reports", icon: FileBarChart, roles: ["admin"] }],
  },
  {
    slug: "proctoring", name: "Exam Proctoring", category: "academics", icon: ClipboardCheck,
    sidebar: [{ label: "Proctoring", to: "proctoring", icon: ClipboardCheck, roles: ["admin"] }],
  },
  {
    slug: "admin-settings", name: "School Settings", category: "operations", icon: Settings, core: true,
    sidebar: [
      { label: "Modules",  to: "modules",  icon: Package,   roles: ["admin"] },
      { label: "Settings", to: "settings", icon: Settings, roles: ["admin"] },
    ],
  },
];

export function getManifest(slug: string): ModuleManifest | undefined {
  return MODULE_MANIFESTS.find(m => m.slug === slug);
}