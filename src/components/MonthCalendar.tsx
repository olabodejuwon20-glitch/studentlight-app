import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type CalendarEvent = {
  id: string;
  date: Date;
  title: string;
  type?: "exam" | "announcement" | "class" | "event";
  meta?: string;
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TONE: Record<string, string> = {
  exam: "bg-destructive/15 text-destructive border-destructive/30",
  announcement: "bg-primary/15 text-primary border-primary/30",
  class: "bg-secondary text-foreground border-border",
  event: "bg-accent/40 text-accent-foreground border-accent",
};

/** Reusable full-month calendar with prev/next navigation, today highlight, and event chips. */
export function MonthCalendar({ events, accent = "primary" }: { events: CalendarEvent[]; accent?: string }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
  });

  const { weeks, monthLabel } = useMemo(() => {
    const first = new Date(cursor);
    const startOffset = first.getDay();
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    const monthLabel = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });
    return { weeks, monthLabel };
  }, [cursor]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const eventsByDay = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    events.forEach(e => {
      const k = new Date(e.date); k.setHours(0, 0, 0, 0);
      const key = k.toISOString().slice(0, 10);
      m.set(key, [...(m.get(key) ?? []), e]);
    });
    return m;
  }, [events]);

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="font-display text-base sm:text-lg font-semibold">{monthLabel}</div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() - 1, 1))}><ChevronLeft className="size-4" /></Button>
          <Button variant="ghost" size="sm" onClick={() => { const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); setCursor(d); }}>Today</Button>
          <Button variant="ghost" size="icon" onClick={() => setCursor(c => new Date(c.getFullYear(), c.getMonth() + 1, 1))}><ChevronRight className="size-4" /></Button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground border-b border-border">
        {DOW.map(d => <div key={d} className="px-2 py-2 text-center font-semibold">{d}</div>)}
      </div>

      <div className="grid grid-cols-7">
        {weeks.flat().map((d, i) => {
          const key = d ? d.toISOString().slice(0, 10) : `empty-${i}`;
          const evts = d ? (eventsByDay.get(key) ?? []) : [];
          const isToday = d && d.getTime() === today.getTime();
          return (
            <div key={key} className={cn(
              "min-h-[72px] sm:min-h-[100px] border-r border-b border-border last:border-r-0 p-1.5 sm:p-2 flex flex-col gap-1",
              !d && "bg-muted/30",
              (i + 1) % 7 === 0 && "border-r-0",
            )}>
              {d && (
                <div className={cn(
                  "text-[11px] sm:text-xs font-semibold size-6 grid place-items-center rounded-full",
                  isToday ? `bg-${accent} text-${accent}-foreground` : "text-foreground"
                )}>{d.getDate()}</div>
              )}
              <div className="flex-1 space-y-1 overflow-hidden">
                {evts.slice(0, 3).map(e => (
                  <div key={e.id} title={e.title} className={cn(
                    "text-[10px] sm:text-[11px] leading-tight rounded-md border px-1.5 py-0.5 truncate",
                    TONE[e.type ?? "event"]
                  )}>{e.title}</div>
                ))}
                {evts.length > 3 && <div className="text-[10px] text-muted-foreground">+{evts.length - 3} more</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}