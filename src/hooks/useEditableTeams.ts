import * as React from "react";
import { useApp } from "@/components/squad/AppLayout";
import type { ModuleKey } from "@/lib/modules";
import type { TeamOption } from "@/hooks/useAccess";
import { canEdit as levelCanEdit } from "@/lib/permissions";

/**
 * Equipos donde el usuario puede CREAR/EDITAR contenido de un módulo.
 * Lee solo el nivel por equipo que devuelve la base de datos (get_my_access).
 */
export function useEditableTeams(moduleKey: ModuleKey): TeamOption[] {
  const { teamOptions, permissionsByTeam } = useApp();
  return React.useMemo(
    () => teamOptions.filter((t) => t.id && levelCanEdit(permissionsByTeam?.[t.id]?.[moduleKey])),
    [teamOptions, permissionsByTeam, moduleKey],
  );
}
