import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSchool } from "@/contexts/SchoolContext";
import { useUnreadCount } from "@/lib/comms";
import { NavLink } from "react-router-dom";
import { schoolPath } from "@/lib/tenant";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface PlatformAnnouncement { id: string; title: string; body: string; priority: string; created_at: string }

export function NotificationBell() {
  const { school, activeRole, user } = useSchool();
  const unread = useUnreadCount(school?.id, user?.id);
  const [announcements, setAnnouncements] = useState<PlatformAnnouncement[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("platform_announcements")
      .select("id,title,body,priority,created_at")
      .order("created_at", { ascending: false })
      .limit(5)
      .then(({ data }) => setAnnouncements((data ?? []) as PlatformAnnouncement[]));
  }, [user?.id]);

  const total = unread + announcements.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-5" />
          {total > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center">
              {total > 99 ? "99+" : total}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-4 py-3 border-b border-border">
          <div className="font-semibold text-sm">Notifications</div>
          <div className="text-[11px] text-muted-foreground">{total === 0 ? "You're all caught up" : `${total} new`}</div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {unread > 0 && school && activeRole && (
            <NavLink to={schoolPath(school.slug, `/app/${activeRole}/inbox`)}
              className="block px-4 py-3 hover:bg-secondary border-b border-border/60">
              <div className="text-sm font-medium">{unread} unread message{unread === 1 ? "" : "s"}</div>
              <div className="text-[11px] text-muted-foreground">Open the inbox to reply</div>
            </NavLink>
          )}
          {announcements.map((a) => (
            <div key={a.id} className={cn("px-4 py-3 border-b border-border/60",
              a.priority === "critical" && "bg-destructive/5",
              a.priority === "high" && "bg-amber-500/5")}>
              <div className="text-sm font-medium truncate">{a.title}</div>
              <div className="text-[11px] text-muted-foreground line-clamp-2">{a.body}</div>
            </div>
          ))}
          {total === 0 && (
            <div className="px-4 py-10 text-center text-xs text-muted-foreground">Nothing new right now</div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}