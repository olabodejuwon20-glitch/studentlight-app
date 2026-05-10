import { GraduationCap } from "lucide-react";

/** Branded header used at the top of school portal auth pages. */
export function SchoolBadge({ name, logoUrl, subtitle }: { name: string; logoUrl?: string | null; subtitle?: string }) {
  return (
    <div className="flex flex-col items-center text-center mb-6">
      {logoUrl ? (
        <img src={logoUrl} alt={`${name} logo`} className="size-20 object-contain rounded-xl border border-border bg-card p-2 shadow-card" />
      ) : (
        <div className="size-20 rounded-xl bg-primary/10 text-primary grid place-items-center border border-border">
          <GraduationCap className="size-9" />
        </div>
      )}
      <h1 className="font-display text-xl font-bold mt-3 leading-tight">{name}</h1>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </div>
  );
}
