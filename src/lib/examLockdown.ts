import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type IntegrityKind =
  | "tab_blur"
  | "fullscreen_exit"
  | "copy_attempt"
  | "paste_attempt"
  | "context_menu"
  | "devtools";

const FRIENDLY: Record<IntegrityKind, string> = {
  tab_blur: "You left the exam window",
  fullscreen_exit: "You exited full-screen mode",
  copy_attempt: "Copying is disabled during the exam",
  paste_attempt: "Pasting is disabled during the exam",
  context_menu: "Right-click is disabled during the exam",
  devtools: "Developer tools are not allowed during the exam",
};

/**
 * Enforces JAMB-style proctored lockdown:
 *  - blocks copy/paste/right-click/devtools shortcuts
 *  - watches tab visibility & fullscreen state
 *  - logs each violation to the server (mock_sessions.integrity_events)
 *  - warns the student and asks the parent to auto-submit after N violations
 */
export function useExamLockdown(opts: {
  enabled: boolean;
  sessionId?: string;
  shellRef: React.RefObject<HTMLElement>;
  isSubmitted: boolean;
  onForceSubmit: () => void;
  maxViolations?: number;
}) {
  const { enabled, sessionId, shellRef, isSubmitted, onForceSubmit } = opts;
  const maxViolations = opts.maxViolations ?? 4;
  const [violations, setViolations] = useState<{ kind: IntegrityKind; at: number }[]>([]);
  const [lastWarning, setLastWarning] = useState<string | null>(null);
  const forced = useRef(false);

  async function log(kind: IntegrityKind) {
    if (!enabled || !sessionId || isSubmitted) return;
    setViolations((v) => {
      const next = [...v, { kind, at: Date.now() }];
      const remaining = Math.max(0, maxViolations - next.length);
      const message = `${FRIENDLY[kind]}. ${remaining} warning${remaining === 1 ? "" : "s"} left before auto-submit.`;
      setLastWarning(message);
      toast.warning(message, { id: "exam-violation" });
      if (next.length >= maxViolations && !forced.current) {
        forced.current = true;
        toast.error("Exam ended due to repeated rule violations.", { id: "exam-violation" });
        onForceSubmit();
      }
      return next;
    });
    try {
      await supabase.rpc("log_mock_integrity_event", {
        _session_id: sessionId,
        _kind: kind,
        _detail: { ua: navigator.userAgent.slice(0, 180) } as any,
      });
    } catch {
      /* swallow — we already warned the student */
    }
  }

  // Visibility / focus
  useEffect(() => {
    if (!enabled || isSubmitted) return;
    const onVis = () => { if (document.hidden) void log("tab_blur"); };
    const onBlur = () => { void log("tab_blur"); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("blur", onBlur);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("blur", onBlur);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isSubmitted, sessionId]);

  // Fullscreen exit detection
  useEffect(() => {
    if (!enabled || isSubmitted) return;
    const onFs = () => {
      if (!document.fullscreenElement) {
        void log("fullscreen_exit");
        // try to recover
        shellRef.current?.requestFullscreen?.().catch(() => {});
      }
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isSubmitted, sessionId]);

  // Copy/paste/context-menu/devtools blocking
  useEffect(() => {
    if (!enabled || isSubmitted) return;
    const block = (kind: IntegrityKind) => (e: Event) => {
      e.preventDefault();
      void log(kind);
    };
    const onCopy = block("copy_attempt");
    const onPaste = block("paste_attempt");
    const onContext = block("context_menu");
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      // Block devtools / view-source / save / print
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(k)) ||
        (e.ctrlKey && ["u", "s", "p"].includes(k)) ||
        (e.metaKey && e.altKey && k === "i")
      ) {
        e.preventDefault();
        void log("devtools");
      }
    };
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContext);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("keydown", onKey, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isSubmitted, sessionId]);

  return {
    violations,
    violationCount: violations.length,
    remaining: Math.max(0, maxViolations - violations.length),
    lastWarning,
  };
}