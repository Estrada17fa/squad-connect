import * as React from "react";
import { useApp } from "@/components/squad/AppLayout";
import type { ModuleKey } from "@/lib/modules";
import {
  canEdit as levelCanEdit,
  canRead as levelCanRead,
  isPersonalModule,
  isPlayerView,
  maxLevel,
  type PermissionLevel,
} from "@/lib/permissions";

/**
 * Nivel efectivo de un módulo POR EQUIPO, en la escala de 6 niveles.
 *
 * Resolución: nivel global (lector_global / editor_global, que aplica a
 * cualquier equipo del club) > override/rol del equipo > permiso club-wide.
 * Super admin siempre 'editor_global'.
 *
 * Ya no existe 'approver': aprobar solicitudes = ser editor del módulo
 * correspondiente.
 */
export function useTeamAccess(moduleKey: ModuleKey) {
  const { permissionsByTeam, globalPermissions, isSuperAdmin } = useApp();

  const levelForTeam = React.useCallback(
    (teamId: string | null | undefined): PermissionLevel => {
      if (isSuperAdmin) return "editor_global";
      const globalLevel = globalPermissions?.[moduleKey];
      const clubLevel = permissionsByTeam?.["club"]?.[moduleKey];
      const teamLevel = teamId ? permissionsByTeam?.[teamId]?.[moduleKey] : undefined;
      return maxLevel(globalLevel, teamLevel ?? clubLevel);
    },
    [permissionsByTeam, globalPermissions, isSuperAdmin, moduleKey],
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
