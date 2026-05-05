import { ReactNode, useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  Bell, ChevronDown, GraduationCap, LayoutDashboard, Users, BookOpen, FileBarChart,
  Settings, ClipboardCheck, FilePlus2, Calendar, Library, Sparkles, MessagesSquare,
  CalendarDays, Wallet, Activity, Sun, Moon, Search, Menu, LogOut, UserSquare2, ListChecks,
  PencilRuler,
} from "lucide-react";
import { Role, ROLE_META, useRole } from "@/contexts/RoleContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV: Record<Role, { label: string; to: string; icon: any }[]> = {
  admin: [
    { label: "Dashboard", to: "/admin",          icon: LayoutDashboard },
    { label: "Students",  to: "/admin/students", icon: Users },
    { label: "Teachers",  to: "/admin/teachers", icon: GraduationCap },
    { label: "Classes",   to: "/admin/classes",  icon: BookOpen },
    { label: "Reports",   to: "/admin/reports",  icon: FileBarChart },
    { label: "Settings",  to: "/admin/settings", icon: Settings },
  ],
  teacher: [
    { label: "Dashboard",   to: "/teacher",            icon: LayoutDashboard },
    { label: "My Classes",  to: "/teacher/classes",    icon: BookOpen },
    { label: "Attendance",  to: "/teacher/attendance", icon: ClipboardCheck },
    { label: "Test Builder",to: "/teacher/tests",      icon: FilePlus2 },
    { label: "Grading",     to: "/teacher/grading",    icon: PencilRuler },
    { label: "Students",    to: "/teacher/students",   icon: Users },
  ],
  student: [
    { label: "Dashboard",  to: "/student",             icon: LayoutDashboard },
    { label: "My Classes", to: "/student/classes",     icon: BookOpen },
    { label: "Exams",      to: "/student/exams",       icon: ListChecks },
    { label: "Results",    to: "/student/results",     icon: FileBarChart },
    { label: "Library",    to: "/student/library",     icon: Library },
    { label: "AI Tutor",   to: "/student/ai-tutor",    icon: Sparkles },
    { label: "Calendar",   to: "/student/calendar",    icon: Calendar },
  ],
  parent: [
    { label: "Dashboard",       to: "/parent",            icon: LayoutDashboard },
    { label: "My Children",     to: "/parent/children",   icon: UserSquare2 },
    { label: "Academic Records",to: "/parent/results",    icon: FileBarChart },
    { label: "Attendance",      to: "/parent/attendance", icon: ClipboardCheck },
    { label: "Activity Feed",   to: "/parent/activity",   icon: Activity },
    { label: "Fees & Payments", to: "/parent/fees",       icon: Wallet },
    { label: "Messages",        to: "/parent/messages",   icon: MessagesSquare },
  ],
};

export default function AppLayout() {
  const { role, setRole, theme, toggleTheme } = useRole();
  const meta = ROLE_META[role];
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const items = NAV[role];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
          collapsed ? "w-[76px]" : "w-[260px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Brand */}
        <div className="px-4 py-5 border-b border-sidebar-border">
          <div
            className="flex items-center gap-3 rounded-lg px-3 py-2.5"
            style={{ background: meta.color, color: "white" }}
          >
            <div className="grid place-items-center size-9 rounded-md bg-white/15 backdrop-blur">
              <GraduationCap className="size-5" />
            </div>
            {!collapsed && (
              <div className="leading-tight">
                <div className="font-display font-bold text-base">EduSmart</div>
                <div className="text-[11px] opacity-90">{meta.portal}</div>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 scrollbar-thin">
          <ul className="space-y-1">
            {items.map((it) => (
              <li key={it.to}>
                <NavLink
                  to={it.to}
                  end={it.to === `/${role}`}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                    )
                  }
                >
                  <it.icon className="size-[18px] shrink-0" />
                  {!collapsed && <span>{it.label}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer card */}
        <div className="p-3 border-t border-sidebar-border">
          {!collapsed && role === "admin" && (
            <div className="mb-3 rounded-lg border border-sidebar-border p-3 bg-card/50">
              <div className="text-xs font-semibold text-foreground">Greenfield Academy</div>
              <div className="text-[11px] text-muted-foreground">ID: SCH-2025-001</div>
            </div>
          )}
          <div className="flex items-center gap-3 px-1">
            <Avatar className="size-9 border border-sidebar-border">
              <AvatarFallback style={{ background: meta.color, color: "white" }} className="text-xs font-semibold">
                {meta.user.split(" ").map(s => s[0]).slice(0,2).join("")}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{meta.user}</div>
                <div className="text-[11px] text-muted-foreground truncate">{meta.subtitle}</div>
              </div>
            )}
          </div>
          {!collapsed && (
            <Button variant="ghost" size="sm" className="w-full justify-start mt-3 text-muted-foreground">
              <LogOut className="size-4 mr-2" /> Logout
            </Button>
          )}
        </div>
      </aside>

      {/* Backdrop mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b border-border">
          <div className="flex items-center gap-3 px-4 lg:px-8 py-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="size-5" />
            </Button>
            <Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={() => setCollapsed(c => !c)}>
              <Menu className="size-5" />
            </Button>

            <PageHeading />

            <div className="ml-auto flex items-center gap-2">
              <div className="hidden md:flex relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Search anything..." className="pl-9 w-[260px] bg-secondary/60 border-transparent focus-visible:bg-card" />
              </div>

              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === "light" ? <Moon className="size-5" /> : <Sun className="size-5" />}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="size-5" />
                    <span className="absolute top-1.5 right-1.5 size-4 rounded-full bg-destructive text-destructive-foreground text-[10px] grid place-items-center font-semibold">3</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-72">
                  <DropdownMenuLabel>Notifications</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex-col items-start gap-0.5">
                    <span className="text-sm">New student registered</span>
                    <span className="text-xs text-muted-foreground">10 mins ago</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex-col items-start gap-0.5">
                    <span className="text-sm">Exam created for JSS 1</span>
                    <span className="text-xs text-muted-foreground">2 hours ago</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex-col items-start gap-0.5">
                    <span className="text-sm">Fee payment received</span>
                    <span className="text-xs text-muted-foreground">3 hours ago</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-secondary/60">
                    <Avatar className="size-9">
                      <AvatarFallback style={{ background: meta.color, color: "white" }} className="text-xs font-semibold">
                        {meta.user.split(" ").map(s => s[0]).slice(0,2).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:block text-left leading-tight">
                      <div className="text-sm font-semibold">{meta.user}</div>
                      <div className="text-[11px] text-muted-foreground">{meta.subtitle}</div>
                    </div>
                    <ChevronDown className="size-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Switch Role (demo)</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {(["admin","teacher","student","parent"] as Role[]).map(r => (
                    <DropdownMenuItem key={r} onClick={() => setRole(r)} className="capitalize gap-2">
                      <span className="size-2 rounded-full" style={{ background: ROLE_META[r].color }} />
                      {ROLE_META[r].name} {role === r && <Badge className="ml-auto" variant="secondary">Active</Badge>}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>Profile</DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 lg:px-8 py-6 animate-fade-in">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function PageHeading() {
  const { role } = useRole();
  const { pathname } = useLocation();
  const map: Record<string, { title: string; sub: string }> = {
    "/admin":            { title: "Admin Dashboard",   sub: "Overview of your school" },
    "/admin/students":   { title: "Students",          sub: "Manage all enrolled students" },
    "/admin/teachers":   { title: "Teachers",          sub: "Manage staff and assignments" },
    "/admin/classes":    { title: "Classes",           sub: "All active classes" },
    "/admin/reports":    { title: "Reports",           sub: "Performance & insights" },
    "/admin/settings":   { title: "Settings",          sub: "School preferences" },
    "/teacher":          { title: "Teacher Dashboard", sub: "Manage your classes and students" },
    "/teacher/classes":  { title: "My Classes",        sub: "View and manage your classes" },
    "/teacher/attendance": { title: "Attendance",      sub: "Mark daily attendance" },
    "/teacher/tests":    { title: "Test Builder",      sub: "Create new assessments" },
    "/teacher/grading":  { title: "Grading",           sub: "Review and grade submissions" },
    "/teacher/students": { title: "Students",          sub: "All students in your classes" },
    "/student":          { title: "Student Dashboard", sub: "Welcome back, John!" },
    "/student/exams":    { title: "Exam Interface",    sub: "Computer-based test" },
    "/student/results":  { title: "My Results",        sub: "Performance summary" },
    "/student/library":  { title: "Library",           sub: "Books & resources" },
    "/student/ai-tutor": { title: "AI Tutor",          sub: "Ask anything, learn faster" },
    "/student/classes":  { title: "My Classes",        sub: "Your enrolled subjects" },
    "/student/calendar": { title: "Calendar",          sub: "Your upcoming events" },
    "/parent":           { title: "Parent Dashboard",  sub: "Good morning, Mrs. Jane" },
    "/parent/children":  { title: "My Children",       sub: "Overview of your children" },
    "/parent/results":   { title: "Academic Records",  sub: "Results across terms" },
    "/parent/attendance":{ title: "Attendance",        sub: "Daily attendance log" },
    "/parent/activity":  { title: "Activity Feed",     sub: "Latest updates" },
    "/parent/fees":      { title: "Fees & Payments",   sub: "Pay & track invoices" },
    "/parent/messages":  { title: "Messages",          sub: "Conversations with teachers" },
  };
  const meta = map[pathname] ?? { title: ROLE_META[role].name + " Portal", sub: "" };
  return (
    <div className="min-w-0">
      <h1 className="font-display text-lg sm:text-xl font-bold leading-tight truncate">{meta.title}</h1>
      <p className="text-xs text-muted-foreground truncate">{meta.sub}</p>
    </div>
  );
}
