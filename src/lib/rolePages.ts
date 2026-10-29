import { Home, Calendar, Building2, MessagesSquare, Shield, type LucideIcon } from "lucide-react";
import {
  MODULES,
  MODULE_MAP,
  COORD_AREAS,
  COORD_LAYOUT,
  RETIRED_MODULES,
  TOGGLE_MODULES,
  type CoordArea,
  type ModuleKey,
} from "./modules";

export type PageKey = "home" | "agenda" | "club" | "coordinacion" | "admin";
export type BaseRole = "admin" | "tecnico" | "medico" | "staff" | "jugador";

export interface PageDef {
  key: PageKey;
  label: string;
  icon: LucideIcon;
  to: string;
}

export const PAGES: PageDef[] = [
  { key: "home", label: "Inicio", icon: Home, to: "/" },
  { key: "agenda", label: "Agenda", icon: Calendar, to: "/agenda" },
  { key: "club", label: "Mi Club", icon: Shield, to: "/mi-club" },
  { key: "coordinacion", label: "Coordinación", icon: MessagesSquare, to: "/coordinacion" },
  { key: "admin", label: "Admin", icon: Building2, to: "/admin" },
];

export const PAGE_MAP: Record<PageKey, PageDef> = Object.fromEntries(
  PAGES.map((p) => [p.key, p]),
) as Record<PageKey, PageDef>;

/** Orden plano de Coordinación (área por área). */
export const COORDINACION_ORDER: ModuleKey[] = COORD_AREAS.flatMap((a) => COORD_LAYOUT[a.key]);

/** Módulos que viven en la página Admin (menú del perfil). */
const ADMIN_MODULES: ModuleKey[] = ["usuarios"];

export interface ResolvedPage {
  page: PageDef;
  modules: ModuleKey[];
  labelOverride?: string;
  /** No aparece en la barra principal (Admin vive en el menú del perfil). */
  hidden?: boolean;
  variant?: "jugador-solicitudes";
}

/**
 * Páginas del usuario. Inicio, Agenda y Mi Club son fijas (solo lectura).
 * Coordinación muestra solo los módulos con acceso; Admin va en el menú del perfil.
 */
export function resolvePagesForUser(
  _baseRole: BaseRole | null,
  accessibleModules: ModuleKey[] | ((key: ModuleKey) => boolean),
  opts?: { canAccessAdmin?: boolean },
): ResolvedPage[] {
  const isAccessible: (k: ModuleKey) => boolean =
    typeof accessibleModules === "function"
      ? accessibleModules
      : ((set) => (k: ModuleKey) => set.has(k))(new Set(accessibleModules));

  const coord = COORDINACION_ORDER.filter(isAccessible);
  const out: ResolvedPage[] = [
    { page: PAGE_MAP.home, modules: [] },
    { page: PAGE_MAP.agenda, modules: ["agenda", "mes"] },
    { page: PAGE_MAP.club, modules: [] },
  ];
  if (coord.length > 0) out.push({ page: PAGE_MAP.coordinacion, modules: coord });
  if (opts?.canAccessAdmin) {
    out.push({ page: PAGE_MAP.admin, modules: ADMIN_MODULES.filter(isAccessible), hidden: true });
  }
  return out;
}

/** Coordinación agrupada por área, sin áreas vacías. */
export function coordAreasForUser(
  modules: ModuleKey[],
): Array<{ key: CoordArea; label: string; modules: ModuleKey[] }> {
  const set = new Set(modules);
  return COORD_AREAS.map((a) => ({ ...a, modules: COORD_LAYOUT[a.key].filter((k) => set.has(k)) })).filter(
    (a) => a.modules.length > 0,
  );
}

export function needsSolicitudesShortcut(
  pages: ResolvedPage[],
  canViewSolicitudes: boolean,
): boolean {
  return canViewSolicitudes && !pages.some((p) => p.modules.includes("solicitudes"));
}

export function inferBaseRole(roleName: string | null | undefined): BaseRole {
  const n = (roleName ?? "").toLowerCase().trim();
  if (n === "admin") return "admin";
  if (n === "técnico" || n === "tecnico") return "tecnico";
  if (n === "médico" || n === "medico") return "medico";
  if (n === "jugador") return "jugador";
  return "staff";
}

export const ALL_MODULE_KEYS: ModuleKey[] = MODULES.map((m) => m.key);
export { MODULE_MAP };

export function findHubForModule(
  visiblePages: ResolvedPage[],
  moduleKey: ModuleKey,
): ResolvedPage | null {
  return visiblePages.find((p) => p.modules.includes(moduleKey)) ?? null;
}

/** Agrupa módulos por página (para listados informativos). */
export function groupModulesByPage(
  _baseRole: BaseRole | null | undefined,
  moduleKeys: ModuleKey[],
): Array<{ page: PageDef; modules: ModuleKey[] }> {
  const set = new Set(moduleKeys);
  const out: Array<{ page: PageDef; modules: ModuleKey[] }> = [];
  const coord = COORDINACION_ORDER.filter((k) => set.has(k));
  if (coord.length) out.push({ page: PAGE_MAP.coordinacion, modules: coord });
  const admin = ADMIN_MODULES.filter((k) => set.has(k));
  if (admin.length) out.push({ page: PAGE_MAP.admin, modules: admin });
  return out;
}

/**
 * Grupos para las matrices de permisos: una tarjeta por área de Coordinación
 * (Sin acceso / Ver / Editor) y una de "Otros" para los de Con/Sin acceso.
 */
export function groupPermissionModulesByPage(): Array<{ page: PageDef; modules: ModuleKey[] }> {
  const groups: Array<{ page: PageDef; modules: ModuleKey[] }> = COORD_AREAS.map((a) => ({
    page: { ...PAGE_MAP.coordinacion, label: `Coordinación · ${a.label}` },
    modules: COORD_LAYOUT[a.key]
      .map((k) => (k === "multimedia_gestion" ? ("multimedia" as ModuleKey) : k))
      .filter((k) => !RETIRED_MODULES.includes(k)),
  }));
  groups.push({ page: { ...PAGE_MAP.admin, label: "Otros" }, modules: TOGGLE_MODULES });
  return groups;
}
