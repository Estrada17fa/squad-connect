import * as React from "react";
import { useApp } from "@/components/squad/AppLayout";
import type { ModuleKey } from "@/lib/modules";
import {
  canEdit as levelCanEdit,
  canRead as levelCanRead,
  isPersonalModule,
  isPlayerView,
  normalizeLevel,
  type PermissionLevel,
} from "@/lib/permissions";

/**
 * Nivel efectivo de un módulo POR EQUIPO, tal como lo calcula la base de datos
 * (get_my_access -> effective_permission). Sin lógica de respaldo: un equipo
 * que no viene en la respuesta queda en 'sin_acceso'. Sin equipo => contexto club.
 */
export function useTeamAccess(moduleKey: ModuleKey) {
  const { permissionsByTeam, isSuperAdmin } = useApp();

  const levelForTeam = React.useCallback(
    (teamId: string | null | undefined): PermissionLevel => {
      const key = teamId ?? "club";
      return normalizeLevel(permissionsByTeam?.[key]?.[moduleKey]);
    },
    [permissionsByTeam, moduleKey],
  );

  const canEditTeam = React.useCallback(
    (teamId: string | null | undefined) => levelCanEdit(levelForTeam(teamId)),
    [levelForTeam],
  );

  const canReadTeam = React.useCallback(
    (teamId: string | null | undefined) => levelCanRead(levelForTeam(teamId)),
    [levelForTeam],
  );

  /**
   * true cuando el usuario está en 'vista_jugador': en módulos personales
   * (salud, desarrollo, nutrición) solo debe ver SUS propios registros.
   */
  const isPlayerScoped = React.useCallback(
    (teamId?: string | null) => !isSuperAdmin && isPlayerView(levelForTeam(teamId)),
    [levelForTeam, isSuperAdmin],
  );

  /** Atajo: módulo con vista personal + vista_jugador => filtrar "solo lo mío". */
  const onlyOwnRows = React.useCallback(
    (teamId?: string | null) => isPersonalModule(moduleKey) && isPlayerScoped(teamId),
    [isPlayerScoped, moduleKey],
  );

  return { levelForTeam, canEditTeam, canReadTeam, isPlayerScoped, onlyOwnRows };
}
