import * as React from "react";
import { useApp } from "@/components/squad/AppLayout";
import type { ModuleKey } from "@/lib/modules";
import type { AccessLevel } from "@/hooks/useAccess";

const EDITOR_LEVELS = new Set<AccessLevel>(["editor", "approver"]);

/**
 * Nivel efectivo de un módulo POR EQUIPO.
 *
 * Resolución: override/rol del equipo > permiso club-wide. Super admin siempre
 * 'approver'.
 *
 * Sobre 'approver': solo el módulo `solicitudes` le da un uso propio (aprobar
 * o rechazar). En el resto de los módulos ('plantel', 'viajes', 'agenda',
 * 'mes', 'coordinacion_interna', 'documentos', 'inventario',
 * 'compras_facturas', 'usuarios') 'approver' equivale a 'editor': cuenta como
 * acceso de escritura y nada más. Es el comportamiento esperado, no un hueco:
 * la aprobación vive en Solicitudes y desde ahí dispara acciones en Inventario
 * y Compras.
 */
export function useTeamAccess(moduleKey: ModuleKey) {
  const { permissionsByTeam, isSuperAdmin } = useApp();

  const levelForTeam = React.useCallback(
    (teamId: string | null | undefined): AccessLevel => {
      if (isSuperAdmin) return "approver";
      const clubLevel = permissionsByTeam?.["club"]?.[moduleKey];
      const teamLevel = teamId ? permissionsByTeam?.[teamId]?.[moduleKey] : undefined;
      return (teamLevel ?? clubLevel ?? "none") as AccessLevel;
    },
    [permissionsByTeam, isSuperAdmin, moduleKey],
  );

  const canEditTeam = React.useCallback(
    (teamId: string | null | undefined) => EDITOR_LEVELS.has(levelForTeam(teamId)),
    [levelForTeam],
  );

  const canReadTeam = React.useCallback(
    (teamId: string | null | undefined) => levelForTeam(teamId) !== "none",
    [levelForTeam],
  );

  return { levelForTeam, canEditTeam, canReadTeam };
}
