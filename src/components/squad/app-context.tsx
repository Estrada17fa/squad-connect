import * as React from "react";
import type { TeamOption } from "@/hooks/useAccess";
import type { PermissionLevel } from "@/lib/permissions";
import type { ModuleKey } from "@/lib/modules";
import type { BaseRole, ResolvedPage } from "@/lib/rolePages";

/**
 * El contexto vive en su propio módulo (y no dentro de `AppLayout`) para que un
 * hot-reload de `AppLayout` no cree un contexto nuevo mientras los consumidores
 * siguen suscritos al anterior: eso provocaba "useApp must be used inside
 * AppLayout" con pantalla en blanco.
 */
export interface AppCtx {
  user: { id: string };
  accessibleModules: ModuleKey[];
  /** Unión (mejor nivel) — úsalo solo para navegación global. */
  permissions: Record<string, PermissionLevel>;
  /** Permisos efectivos (unión de membresías). */
  activePermissions: Record<string, PermissionLevel>;
  /** Devuelve el nivel efectivo para un módulo específico según su scope. */
  getModuleAccess: (key: ModuleKey) => PermissionLevel;
  /** ¿Puede ver el módulo en cualquier contexto? */
  canViewModule: (key: ModuleKey) => boolean;
  /** ¿Puede editar el módulo en algún contexto? */
  canEditModule: (key: ModuleKey) => boolean;
  /** Equipos a los que el usuario tiene acceso (para filtros y selectores). */
  teamOptions: TeamOption[];
  /** Permisos efectivos por equipo (clave 'club' = ámbito club). */
  permissionsByTeam: Record<string, Record<string, PermissionLevel>>;
  /** Niveles globales (aplican a cualquier equipo del club). */
  globalPermissions: Record<string, PermissionLevel>;

  clubName: string | null;
  isSuperAdmin: boolean;
  /** true si el usuario ve todo el club (no-jugadores + super admin). */
  viewsAllClub: boolean;
  /** true si el usuario es exclusivamente jugador. */
  isPlayerOnly: boolean;
  profile: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    club_id: string | null;
  } | null;
  /** Rol base derivado del equipo activo (para el mapping de páginas). */
  activeBaseRole: BaseRole;
  /** Páginas visibles con los módulos que caen dentro de cada una. */
  visiblePages: ResolvedPage[];
}

export const AppContext = React.createContext<AppCtx | null>(null);

export function useApp() {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppLayout");
  return ctx;
}
