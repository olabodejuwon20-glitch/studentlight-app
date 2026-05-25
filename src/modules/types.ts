import { LucideIcon } from "lucide-react";
import { Role } from "@/contexts/SchoolContext";

export type ModuleCategory = "academics" | "operations" | "communication" | "intelligence" | "finance";

export interface ModuleSidebarItem {
  label: string;
  to: string;           // relative to /:slug/app/:role/
  icon: LucideIcon;
  roles: Role[];        // which roles see this item
}

export interface ModuleManifest {
  slug: string;                       // matches modules.slug in DB
  name: string;
  description?: string;
  icon: LucideIcon;
  category: ModuleCategory;
  /** If true, module is always on regardless of school_modules row (core platform). */
  core?: boolean;
  /** Default config merged into school_modules.config when missing. */
  defaultConfig?: Record<string, unknown>;
  /** Sidebar entries this module contributes. */
  sidebar: ModuleSidebarItem[];
}