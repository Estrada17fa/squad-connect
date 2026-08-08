import * as React from "react";
import { useApp } from "@/components/squad/AppLayout";
import type { ModuleKey } from "@/lib/modules";
import type { TeamOption } from "@/hooks/useAccess";
import { canEdit as levelCanEdit, maxLevel } from "@/lib/permissions";

/**
 * Equipos donde el usuario puede CREAR/EDITAR contenido de un módulo.
 * Es un subconjunto de los equipos que puede ver: si solo tiene lectura en un
 * equipo, ese equipo no aparece como destino en los formularios.
 * 'editor_global' habilita cualquier equipo del club.
 */
export function useEditableTeams(moduleKey: ModuleKey): TeamOption[] {
  const { teamOptions, permissionsByTeam, globalPermissions, isSuperAdmin } = useApp();
  return React.useMemo(() => {
    if (isSuperAdmin) return teamOptions;
    const globalLevel = globalPermissions?.[moduleKey];
    if (levelCanEdit(globalLevel)) return teamOptions;
    const clubLevel = permissionsByTeam?.["club"]?.[moduleKey];
    return teamOptions.filter((t) => {
      const teamLevel = t.id ? permissionsByTeam?.[t.id]?.[moduleKey] : undefined;
      return levelCanEdit(maxLevel(globalLevel, teamLevel ?? clubLevel));
    });
  }, [teamOptions, permissionsByTeam, globalPermissions, isSuperAdmin, moduleKey]);
}

