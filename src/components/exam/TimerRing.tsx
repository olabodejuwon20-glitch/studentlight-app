import { cn } from "@/lib/utils";

interface Props {
  /** seconds remaining */
  remaining: number;
  /** total exam seconds */
  total: number;
  size?: number;
  className?: string;
}

export function TimerRing({ remaining, total, size = 56, className }: Props) {
  const pct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);
  const danger = remaining < 60;
  const warn = remaining < 300 && !danger;
  const color = danger ? "hsl(var(--destructive))" : warn ? "hsl(var(--warning))" : "hsl(var(--primary))";
  const m = Math.floor(Math.max(0, remaining) / 60);
  const s = Math.max(0, remaining) % 60;
  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--border))" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s linear, stroke 0.3s" }}
        />
      </svg>
      <div className={cn("absolute inset-0 grid place-items-center text-[11px] font-mono font-bold", danger && "text-destructive")}>
        {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
      </div>
    </div>
  );
}