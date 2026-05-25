import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MODULE_MANIFESTS } from "./registry";
import { ModuleManifest } from "./types";

export interface EnabledModule extends ManifestWithConfig {}
interface ManifestWithConfig extends ModuleManifest {
  config: Record<string, unknown>;
  enabled: boolean;
}

/**
 * Resolves which modules are enabled for the given school.
 *
 * Strategy:
 *  - Pulls school_modules rows joined to modules.
 *  - Returns every in-repo manifest as "enabled" UNLESS the DB explicitly disables it.
 *  - core: true manifests are always enabled.
 *  - Merges defaultConfig with row.config so consumers always have a full config object.
 *
 * This keeps the UI working for schools that haven't been provisioned with module rows yet,
 * while still allowing super admins to disable specific modules per school going forward.
 */
export function useEnabledModules(schoolId: string | undefined) {
  return useQuery({
    queryKey: ["enabled-modules", schoolId],
    enabled: !!schoolId,
    staleTime: 60_000,
    queryFn: async (): Promise<EnabledModule[]> => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from("school_modules")
        .select("enabled, config, modules!inner(slug)")
        .eq("school_id", schoolId);
      if (error) throw error;

      const dbBySlug = new Map<string, { enabled: boolean; config: Record<string, unknown> }>();
      (data ?? []).forEach((row: any) => {
        const slug = row.modules?.slug;
        if (!slug) return;
        dbBySlug.set(slug, { enabled: !!row.enabled, config: row.config ?? {} });
      });

      return MODULE_MANIFESTS.map(m => {
        const db = dbBySlug.get(m.slug);
        const enabled = m.core ? true : db ? db.enabled : true;
        const config = { ...(m.defaultConfig ?? {}), ...(db?.config ?? {}) };
        return { ...m, enabled, config };
      }).filter(m => m.enabled);
    },
  });
}

export function useModuleConfig<T = Record<string, unknown>>(
  schoolId: string | undefined,
  slug: string,
): T | undefined {
  const { data } = useEnabledModules(schoolId);
  return (data?.find(m => m.slug === slug)?.config as T | undefined);
}