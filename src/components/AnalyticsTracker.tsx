import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useSchool } from "@/contexts/SchoolContext";
import { trackPageView } from "@/lib/analytics";

export default function AnalyticsTracker() {
  const { pathname, search } = useLocation();
  const { user, school } = useSchool();
  const last = useRef<string>("");
  useEffect(() => {
    const full = pathname + (search || "");
    if (full === last.current) return;
    last.current = full;
    trackPageView(full, user?.id ?? null, school?.id ?? null);
  }, [pathname, search, user?.id, school?.id]);
  return null;
}