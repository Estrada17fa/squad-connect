import * as React from "react";
import { useApp } from "@/components/squad/AppLayout";
import type { ModuleKey } from "@/lib/modules";
import type { TeamOption } from "@/hooks/useAccess";

const EDITOR_LEVELS = new Set(["editor", "approver"]);

/**
 * Equipos donde el usuario puede CREAR/EDITAR contenido de un módulo.
 * Es un subconjunto de los equipos que puede ver: si solo tiene lectura en un
 * equipo, ese equipo no aparece como destino en los formularios.
 */
export function useEditableTeams(moduleKey: ModuleKey): TeamOption[] {
  const { teamOptions, permissionsByTeam, isSuperAdmin } = useApp();
  return React.useMemo(() => {
    if (isSuperAdmin) return teamOptions;
    const clubLevel = permissionsByTeam?.["club"]?.[moduleKey];
    return teamOptions.filter((t) => {
      const teamLevel = t.id ? permissionsByTeam?.[t.id]?.[moduleKey] : undefined;
      const level = teamLevel ?? clubLevel;
      return !!level && EDITOR_LEVELS.has(level);
    });
  }, [teamOptions, permissionsByTeam, isSuperAdmin, moduleKey]);
}
