import { useState } from "react";
import { Outlet, NavLink, useLocation, Navigate } from "react-router-dom";
import {
  Bell, ChevronDown, GraduationCap, LayoutDashboard, Users, BookOpen, FileBarChart,
  Settings, ClipboardCheck, FilePlus2, Calendar, Library, Sparkles, MessagesSquare,
  Wallet, Activity, Sun, Moon, Search, Menu, LogOut, UserSquare2, ListChecks, PencilRuler,
  Building2, Ticket, Plus,
} from "lucide-react";
import { ROLE_META, Role, useSchool } from "@/contexts/SchoolContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV: Record<Role, { label: string; to: string; icon: any }[]> = {
  admin: [
    { label: "Dashboard", to: "",          icon: LayoutDashboard },
    { label: "Students",  to: "students",  icon: Users },
    { label: "Teachers",  to: "teachers",  icon: GraduationCap },
    { label: "Classes",   to: "classes",   icon: BookOpen },
    { label: "Reports",   to: "reports",   icon: FileBarChart },
    { label: "Invites",   to: "invites",   icon: Ticket },
    { label: "New School", to: "new-school", icon: Plus },
    { label: "Settings",  to: "settings",  icon: Settings },
  ],
  teacher: [
    { label: "Dashboard",   to: "",            icon: LayoutDashboard },
    { label: "My Classes",  to: "classes",     icon: BookOpen },
    { label: "Attendance",  to: "attendance",  icon: ClipboardCheck },
    { label: "Test Builder",to: "tests",       icon: FilePlus2 },
    { label: "Grading",     to: "grading",     icon: PencilRuler },
    { label: "Students",    to: "students",    icon: Users },
  ],
  student: [
    { label: "Dashboard",  to: "",          icon: LayoutDashboard },
    { label: "My Classes", to: "classes",   icon: BookOpen },
    { label: "Exams",      to: "exams",     icon: ListChecks },
    { label: "Results",    to: "results",   icon: FileBarChart },
    { label: "Library",    to: "library",   icon: Library },
    { label: "AI Tutor",   to: "ai-tutor",  icon: Sparkles },
    { label: "Calendar",   to: "calendar",  icon: Calendar },
  ],
  parent: [
    { label: "Dashboard",       to: "",            icon: LayoutDashboard },
    { label: "My Children",     to: "children",    icon: UserSquare2 },
    { label: "Academic Records",to: "results",     icon: FileBarChart },
    { label: "Attendance",      to: "attendance",  icon: ClipboardCheck },
    { label: "Activity Feed",   to: "activity",    icon: Activity },
    { label: "Fees & Payments", to: "fees",        icon: Wallet },
    { label: "Messages",        to: "messages",    icon: MessagesSquare },
  ],
};

const TITLES: Record<string, { title: string; sub: string }> = {
  "":           { title: "Dashboard",          sub: "Overview" },
  "students":   { title: "Students",           sub: "Manage all enrolled students" },
  "teachers":   { title: "Teachers",           sub: "Manage staff and assignments" },
  "classes":    { title: "Classes",            sub: "All active classes" },
  "reports":    { title: "Reports",            sub: "Performance & insights" },
  "invites":    { title: "Invites",            sub: "Generate join codes" },
  "new-school": { title: "Create School",      sub: "Spin up a new tenant" },
  "settings":   { title: "Settings",           sub: "School preferences" },
  "attendance": { title: "Attendance",         sub: "Daily attendance" },
  "tests":      { title: "Test Builder",       sub: "Create assessments" },
  "grading":    { title: "Grading",            sub: "Review submissions" },
  "exams":      { title: "Exam Interface",     sub: "Computer-based test" },
  "results":    { title: "Results",            sub: "Performance summary" },
  "library":    { title: "Library",            sub: "Books & resources" },
  "ai-tutor":   { title: "AI Tutor",           sub: "Ask anything, learn faster" },
  "calendar":   { title: "Calendar",           sub: "Upcoming events" },
  "children":   { title: "My Children",        sub: "Overview of your children" },
  "activity":   { title: "Activity Feed",      sub: "Latest updates" },
  "fees":       { title: "Fees & Payments",    sub: "Pay & track invoices" },
  "messages":   { title: "Messages",           sub: "Conversations" },
};

export default function AppLayout() {
  const { school, activeRole, theme, toggleTheme, signOut, displayName, email, photoUrl } = useSchool();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!school || !activeRole) return <Navigate to="/onboarding" replace />;

  const meta = ROLE_META[activeRole];
  const items = NAV[activeRole];
  const userLabel = displayName || email || "User";
  const initials = userLabel.split(/[\s@]/).filter(Boolean).map(s => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen flex bg-background">
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-40 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300",
        collapsed ? "w-[76px]" : "w-[260px]",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="px-4 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ background: meta.color, color: "white" }}>
            <div className="grid place-items-center size-9 rounded-md bg-white/15 backdrop-blur"><GraduationCap className="size-5" /></div>
            {!collapsed && (
              <div className="leading-tight min-w-0">
                <div className="font-display font-bold text-base truncate">EduSmart</div>
                <div className="text-[11px] opacity-90 truncate">{meta.portal}</div>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-1">
            {items.map((it) => {
              const path = it.to ? `/app/${activeRole}/${it.to}` : `/app/${activeRole}`;
              return (
                <li key={path}>
                  <NavLink to={path} end={!it.to} onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      cn("flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground hover:bg-sidebar-accent/60")}>
                    <it.icon className="size-[18px] shrink-0" />
                    {!collapsed && <span>{it.label}</span>}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          {!collapsed && (
            <div className="mb-3 rounded-lg border border-sidebar-border p-3 bg-card/50">
              <div className="flex items-center gap-2"><Building2 className="size-3.5 text-muted-foreground" /><div className="text-xs font-semibold text-foreground truncate">{school.name}</div></div>
              <div className="text-[11px] text-muted-foreground truncate">/{school.slug}</div>
            </div>
          )}
          <div className="flex items-center gap-3 px-1">
            <Avatar className="size-9 border border-sidebar-border ring-2 ring-background">
              {photoUrl && <AvatarImage src={photoUrl} alt={userLabel} />}
              <AvatarFallback style={{ background: meta.color, color: "white" }} className="text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold truncate">{userLabel}</div>
                <div className="text-[11px] text-muted-foreground truncate capitalize">{activeRole}</div>
              </div>
            )}
          </div>
          {!collapsed && (
            <Button variant="ghost" size="sm" className="w-full justify-start mt-3 text-muted-foreground" onClick={signOut}>
              <LogOut className="size-4 mr-2" /> Logout
            </Button>
          )}
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-background/80 backdrop-blur border-b border-border">
          <div className="flex items-center gap-3 px-4 lg:px-8 py-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="size-5" /></Button>
            <Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={() => setCollapsed(c => !c)}><Menu className="size-5" /></Button>
            <PageHeading />
            <div className="ml-auto flex items-center gap-2">
              <div className="hidden md:flex relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Search anything..." className="pl-9 w-[260px] bg-secondary/60 border-transparent focus-visible:bg-card" />
              </div>
              <Button variant="ghost" size="icon" onClick={toggleTheme}>{theme === "light" ? <Moon className="size-5" /> : <Sun className="size-5" />}</Button>
              <Button variant="ghost" size="icon"><Bell className="size-5" /></Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-secondary/60">
                    <Avatar className="size-9 ring-2 ring-background">
                      {photoUrl && <AvatarImage src={photoUrl} alt={userLabel} />}
                      <AvatarFallback style={{ background: meta.color, color: "white" }} className="text-xs font-semibold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:block text-left leading-tight">
                      <div className="text-sm font-semibold">{userLabel}</div>
                      <div className="text-[11px] text-muted-foreground capitalize">{activeRole}</div>
                    </div>
                    <ChevronDown className="size-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{school.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => window.location.href = "/onboarding"}>Switch school</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={signOut}>Logout</DropdownMenuItem>
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
  const { activeRole, school } = useSchool();
  const { pathname } = useLocation();
  if (!activeRole || !school) return null;
  const segs = pathname.split("/").filter(Boolean);  // ["app", role, ...sub]
  const sub = segs.slice(2).join("/");
  const meta = TITLES[sub] ?? { title: ROLE_META[activeRole].name + " Portal", sub: school.name };
  return (
    <div className="min-w-0">
      <h1 className="font-display text-lg sm:text-xl font-bold leading-tight truncate">{meta.title}</h1>
      <p className="text-xs text-muted-foreground truncate">{meta.sub}</p>
    </div>
  );
}
