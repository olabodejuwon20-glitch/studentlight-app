// Exam retake rules driven by proctored-lockdown strike count.
//
// Strikes are the number of integrity events recorded against a JAMB/NECO
// mock session (tab-switches, fullscreen exits, copy/paste attempts, devtools
// shortcuts, right-clicks). A session is force-submitted at 4 strikes.
//
// Policy:
//   0-1 strikes  → clean run, retake any time
//   2   strikes  → 1-hour cooldown, then retake freely
//   3   strikes  → 24-hour cooldown, optional teacher override
//   4+  strikes  → force-submitted; 7-day lockout, teacher unlock required

export type RetakeStatus = "free" | "cooldown" | "locked";

export type RetakePolicy = {
  status: RetakeStatus;
  strikes: number;
  maxStrikes: number;
  /** Earliest time (ms) the student may retake on their own. */
  retakeAt: number | null;
  /** Short headline for badges/buttons. */
  headline: string;
  /** Friendly multi-sentence explanation for the result card. */
  message: string;
  /** Tone hint for UI colouring. */
  tone: "success" | "warning" | "destructive";
  /** True when the student can immediately start another attempt. */
  canRetakeNow: boolean;
  /** True when only a teacher/admin can clear the block. */
  requiresTeacherOverride: boolean;
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const MAX_STRIKES = 4;

export function getRetakePolicy(opts: {
  strikes: number;
  submittedAt?: string | Date | null;
  /** Was the lockdown active for this session? Free practice runs are always "free". */
  lockdown?: boolean;
}): RetakePolicy {
  const strikes = Math.max(0, opts.strikes | 0);
  const submittedMs = opts.submittedAt ? new Date(opts.submittedAt).getTime() : Date.now();

  if (!opts.lockdown) {
    return {
      status: "free", strikes, maxStrikes: MAX_STRIKES, retakeAt: null,
      headline: "Retake any time",
      message: "This was a practice run — proctoring was off, so there is no retake penalty.",
      tone: "success", canRetakeNow: true, requiresTeacherOverride: false,
    };
  }

  if (strikes <= 1) {
    return {
      status: "free", strikes, maxStrikes: MAX_STRIKES, retakeAt: null,
      headline: strikes === 0 ? "Clean run" : "1 warning recorded",
      message: strikes === 0
        ? "No integrity events were recorded. You can sit another mock whenever you're ready."
        : "One minor warning was recorded. You can still retake immediately — try to stay in full-screen next time.",
      tone: "success", canRetakeNow: true, requiresTeacherOverride: false,
    };
  }

  if (strikes === 2) {
    const retakeAt = submittedMs + HOUR;
    return {
      status: "cooldown", strikes, maxStrikes: MAX_STRIKES, retakeAt,
      headline: "1-hour cooldown",
      message: "Two warnings were recorded. To encourage focus, the next attempt unlocks after a 1-hour cooldown.",
      tone: "warning", canRetakeNow: Date.now() >= retakeAt, requiresTeacherOverride: false,
    };
  }

  if (strikes === 3) {
    const retakeAt = submittedMs + DAY;
    return {
      status: "cooldown", strikes, maxStrikes: MAX_STRIKES, retakeAt,
      headline: "24-hour cooldown",
      message: "Three warnings were recorded — close to the limit. Your next attempt unlocks in 24 hours. A teacher can clear the cooldown sooner if needed.",
      tone: "warning", canRetakeNow: Date.now() >= retakeAt, requiresTeacherOverride: false,
    };
  }

  // 4+ strikes: force-submitted
  const retakeAt = submittedMs + 7 * DAY;
  return {
    status: "locked", strikes, maxStrikes: MAX_STRIKES, retakeAt,
    headline: "Locked out — teacher unlock required",
    message: "This mock was auto-submitted because the integrity limit was reached. Self-service retakes are paused for 7 days. Please speak to your teacher or admin to review what happened and unlock a fresh attempt sooner.",
    tone: "destructive", canRetakeNow: false, requiresTeacherOverride: true,
  };
}

export function formatRetakeCountdown(retakeAt: number | null): string {
  if (!retakeAt) return "";
  const ms = retakeAt - Date.now();
  if (ms <= 0) return "available now";
  const mins = Math.ceil(ms / 60000);
  if (mins < 60) return `in ${mins} min${mins === 1 ? "" : "s"}`;
  const hrs = Math.ceil(mins / 60);
  if (hrs < 48) return `in ${hrs} hour${hrs === 1 ? "" : "s"}`;
  const days = Math.ceil(hrs / 24);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}