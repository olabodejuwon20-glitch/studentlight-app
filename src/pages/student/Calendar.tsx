import { Calendar as CalIcon } from "lucide-react";
import { SectionCard } from "@/components/dashboard/SectionCard";
import { EmptyState } from "@/components/EmptyState";
export default function StudentCalendar() {
  return <SectionCard title="Calendar"><EmptyState icon={CalIcon} title="No events scheduled" /></SectionCard>;
}
