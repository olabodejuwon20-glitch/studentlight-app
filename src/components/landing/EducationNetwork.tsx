import { useState } from "react";
import {
  GraduationCap, Users, Sparkles, ClipboardCheck, Wallet, Library,
  BookOpen, MessageCircle, BarChart3, Bus, UserSquare2,
} from "lucide-react";

type Node = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  /** angle in degrees, 0 = right, 90 = bottom */
  angle: number;
};

const NODES: Node[] = [
  { id: "analytics",    label: "Analytics",     icon: BarChart3,     angle: -90 },
  { id: "ai",           label: "AI Copilot",    icon: Sparkles,      angle: -54 },
  { id: "finance",      label: "Finance",       icon: Wallet,        angle: -18 },
  { id: "parents",      label: "Parents",       icon: Users,         angle: 18  },
  { id: "students",     label: "Students",      icon: GraduationCap, angle: 54  },
  { id: "library",      label: "Library",       icon: Library,       angle: 90  },
  { id: "transport",    label: "Transport",     icon: Bus,           angle: 126 },
  { id: "exams",        label: "Examinations",  icon: ClipboardCheck,angle: 162 },
  { id: "teachers",     label: "Teachers",      icon: UserSquare2,   angle: 198 },
  { id: "comms",        label: "Communication", icon: MessageCircle, angle: 234 },
  { id: "academics",    label: "Academics",     icon: BookOpen,      angle: 270 },
];

// SVG viewBox is 600 x 600, center at (300, 300).
const CX = 300;
const CY = 300;
const R = 230;         // orbit radius
const CENTER_R = 66;   // center circle radius

function polar(angleDeg: number, radius: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(a), y: CY + radius * Math.sin(a) };
}

/** Curved path from center edge to node, bowed outward. */
function curvedPath(angleDeg: number) {
  const start = polar(angleDeg, CENTER_R);
  const end = polar(angleDeg, R - 34);
  // control point rotated 12° so line bows
  const ctrl = polar(angleDeg + 12, (CENTER_R + R) / 2);
  return `M ${start.x} ${start.y} Q ${ctrl.x} ${ctrl.y} ${end.x} ${end.y}`;
}

export default function EducationNetwork() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="relative w-full aspect-square max-w-[560px] mx-auto">
      {/* soft radial background glow */}
      <div
        aria-hidden
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, hsl(217 91% 60% / 0.14), transparent 65%)",
          filter: "blur(6px)",
        }}
      />

      {/* Desktop / tablet: orbital network */}
      <div className="hidden sm:block absolute inset-0">
        <svg
          viewBox="0 0 600 600"
          className="absolute inset-0 w-full h-full overflow-visible"
          aria-hidden
        >
          <defs>
            <radialGradient id="ln-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="1" />
              <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
            </radialGradient>
            <filter id="soft-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* orbit ring */}
          <circle
            cx={CX} cy={CY} r={R}
            fill="none"
            stroke="hsl(217 91% 60% / 0.10)"
            strokeDasharray="2 6"
            strokeWidth={1}
          />

          {/* connector lines + traveling particles */}
          {NODES.map((n, i) => {
            const id = `path-${n.id}`;
            const isHot = hovered === n.id;
            return (
              <g key={n.id}>
                <path
                  id={id}
                  d={curvedPath(n.angle)}
                  fill="none"
                  stroke={isHot ? "#2563eb" : "#93c5fd"}
                  strokeOpacity={isHot ? 0.9 : 0.45}
                  strokeWidth={isHot ? 1.6 : 1}
                  filter={isHot ? "url(#soft-glow)" : undefined}
                  style={{ transition: "all 300ms ease" }}
                />
                {/* traveling particle */}
                <circle r={isHot ? 5 : 3.5} fill="url(#ln-glow)" filter="url(#soft-glow)">
                  <animateMotion
                    dur={`${isHot ? 1.4 : 2.6 + (i % 4) * 0.25}s`}
                    repeatCount="indefinite"
                    rotate="auto"
                    begin={`${(i * 0.22).toFixed(2)}s`}
                  >
                    <mpath href={`#${id}`} />
                  </animateMotion>
                </circle>
              </g>
            );
          })}
        </svg>

        {/* Center glass badge */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 en-pulse"
          style={{ width: `${(CENTER_R * 2) / 600 * 100}%`, aspectRatio: "1 / 1" }}
        >
          <div className="relative w-full h-full rounded-full grid place-items-center bg-white/70 backdrop-blur-xl border border-primary/30 shadow-[0_10px_40px_-10px_hsl(217_91%_60%/0.55)]">
            <div
              aria-hidden
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 30% 25%, hsl(217 91% 70% / 0.35), transparent 55%)",
              }}
            />
            <div className="relative flex flex-col items-center gap-1">
              <div className="grid place-items-center size-8 sm:size-9 rounded-lg bg-primary text-primary-foreground shadow">
                <GraduationCap className="size-5" />
              </div>
              <div className="text-[10px] sm:text-[11px] font-display font-bold tracking-wider text-foreground/80">
                LEGACYSKOOL OS
              </div>
            </div>
          </div>
        </div>

        {/* Node badges */}
        {NODES.map((n, i) => {
          const p = polar(n.angle, R);
          const left = (p.x / 600) * 100;
          const top = (p.y / 600) * 100;
          const Icon = n.icon;
          const isHot = hovered === n.id;
          return (
            <button
              key={n.id}
              type="button"
              onMouseEnter={() => setHovered(n.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(n.id)}
              onBlur={() => setHovered(null)}
              className="absolute -translate-x-1/2 -translate-y-1/2 outline-none group"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                animation: `en-float 6s ease-in-out ${i * 0.35}s infinite`,
              }}
              aria-label={n.label}
            >
              <div
                className={`flex flex-col items-center gap-1.5 transition-transform duration-300 ${
                  isHot ? "scale-110" : "group-hover:scale-105"
                }`}
              >
                <div
                  className={`grid place-items-center size-10 sm:size-11 rounded-xl bg-white/80 backdrop-blur border shadow-sm transition-all ${
                    isHot
                      ? "border-primary/60 shadow-[0_0_0_4px_hsl(217_91%_60%/0.15),0_8px_24px_-8px_hsl(217_91%_60%/0.55)] text-primary"
                      : "border-border text-foreground/70"
                  }`}
                >
                  <Icon className="size-5" />
                </div>
                <span
                  className={`text-[10px] sm:text-[11px] font-medium whitespace-nowrap px-1.5 py-0.5 rounded transition-colors ${
                    isHot ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {n.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Mobile: vertical flow */}
      <div className="sm:hidden relative py-4">
        <div className="flex flex-col items-center gap-3">
          <div className="relative en-pulse">
            <div className="size-16 rounded-full grid place-items-center bg-white/80 backdrop-blur-xl border border-primary/30 shadow-[0_10px_30px_-10px_hsl(217_91%_60%/0.5)]">
              <GraduationCap className="size-6 text-primary" />
            </div>
            <div className="text-[10px] font-display font-bold tracking-wider text-center mt-1 text-foreground/80">
              LEGACYSKOOL OS
            </div>
          </div>
          <div className="relative w-px flex-1 min-h-[8px] bg-gradient-to-b from-primary/40 to-transparent" />
          {NODES.slice(0, 6).map((n, i) => {
            const Icon = n.icon;
            return (
              <div key={n.id} className="flex flex-col items-center gap-1.5">
                <div className="relative h-4 w-px overflow-hidden">
                  <div
                    className="absolute inset-x-[-1px] top-0 h-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(217_91%_60%)]"
                    style={{ animation: `en-drop 2.2s ease-in ${i * 0.25}s infinite` }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-primary/40 to-primary/10" />
                </div>
                <div className="flex items-center gap-2 rounded-full border border-border bg-white/80 backdrop-blur px-3 py-1.5 shadow-sm">
                  <Icon className="size-4 text-primary" />
                  <span className="text-xs font-medium text-foreground/80">{n.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes en-float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
          50%      { transform: translate(-50%, -50%) translateY(-4px); }
        }
        @keyframes en-pulse {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.025); }
        }
        .en-pulse { animation: en-pulse 4s ease-in-out infinite; }
        @keyframes en-drop {
          0%   { transform: translateY(-100%); opacity: 0; }
          20%  { opacity: 1; }
          100% { transform: translateY(400%); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .en-pulse, [style*="en-float"] { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
