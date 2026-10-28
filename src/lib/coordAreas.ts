import { Briefcase, ClipboardList, Megaphone, Plane, Stethoscope, type LucideIcon } from "lucide-react";
import type { ModuleKey } from "@/lib/modules";
import {
  LEVEL_RANK,
  canAccessExpensesModule,
  canManageTripsModule,
  normalizeLevel,
  type PermissionLevel,
} from "@/lib/permissions";

/**
 * Mapa único de las áreas de Coordinación. Orden fijo. Para sumar un módulo,
 * agrega una línea en `modules` y su archivo de ruta
 * `src/routes/_authenticated/coordinacion.<area>.<module>.tsx`.
 */
export const COORD_AREAS = [
  {
    key: "tecnica",
    label: "Técnica",
    icon: ClipboardList as LucideIcon,
    subtitle: "Plantel, entrenamientos, convocatorias y evaluaciones",
    modules: [
      { key: "plantel", to: "/coordinacion/tecnica/plantel" },
      { key: "entrenamientos", to: "/coordinacion/tecnica/entrenamientos" },
      { key: "partidos", to: "/coordinacion/tecnica/partidos" },
      { key: "desarrollo", to: "/coordinacion/tecnica/desarrollo", label: "Evaluaciones" },
      { key: "torneo", to: "/coordinacion/tecnica/torneo" },
    ],
  },
  {
    key: "medica",
    label: "Médica",
    icon: Stethoscope as LucideIcon,
    subtitle: "Salud y nutrición del plantel",
    modules: [
      { key: "salud", to: "/coordinacion/medica/salud" },
      { key: "nutricion", to: "/coordinacion/medica/nutricion" },
    ],
  },
  {
    key: "operacional",
    label: "Operacional",
    icon: Plane as LucideIcon,
    subtitle: "Viajes, logística e inventario",
    modules: [
      { key: "viajes", to: "/coordinacion/operacional/viajes" },
      { key: "inventario", to: "/coordinacion/operacional/inventario" },
    ],
  },
  {
    key: "administrativa",
    label: "Administrativa",
    icon: Briefcase as LucideIcon,
    subtitle: "Compras, finanzas y documentos del club",
    modules: [
      { key: "compras_facturas", to: "/coordinacion/administrativa/compras_facturas" },
      { key: "documentos", to: "/coordinacion/administrativa/documentos" },
    ],
  },
  {
    key: "general",
    label: "General",
    icon: Megaphone as LucideIcon,
    subtitle: "Tareas, juntas, comunicados, multimedia y solicitudes",
    modules: [
      { key: "coordinacion_interna", to: "/coordinacion/general/coordinacion_interna", label: "Tareas y juntas" },
      { key: "comunicados", to: "/coordinacion/general/comunicados" },
      { key: "multimedia_gestion", to: "/coordinacion/general/multimedia_gestion", label: "Multimedia" },
      { key: "solicitudes", to: "/coordinacion/general/solicitudes" },
    ],
  },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  icon: LucideIcon;
  subtitle: string;
  modules: ReadonlyArray<{ key: ModuleKey; to: `/coordinacion/${string}/${string}`; label?: string }>;
}>;

export type CoordArea = (typeof COORD_AREAS)[number];
export type CoordAreaKey = CoordArea["key"];
export type CoordModule = CoordArea["modules"][number];
export type CoordPath = CoordModule["to"];

/**
 * ¿El módulo aparece en Coordinación? Coordinación es de gestión: pide
 * lector_categoria o más (Vista Jugador nunca alcanza), con las reglas
 * especiales de Compras y Viajes. El nivel viene de get_my_access.
 */
export function isCoordModuleVisible(
  key: ModuleKey,
  level: PermissionLevel | undefined | null,
  isSuperAdmin: boolean,
): boolean {
  if (isSuperAdmin) return true;
  if (key === "compras_facturas") return canAccessExpensesModule(level);
  if (key === "viajes") return canManageTripsModule(level);
  return LEVEL_RANK[normalizeLevel(level)] >= LEVEL_RANK.lector_categoria;
}

export interface VisibleCoordArea {
  area: CoordArea;
  modules: CoordModule[];
}

export function resolveCoordAreas(isVisible: (key: ModuleKey) => boolean): VisibleCoordArea[] {
  const out: VisibleCoordArea[] = [];
  for (const area of COORD_AREAS) {
    const modules = (area.modules as readonly CoordModule[]).filter((m) => isVisible(m.key));
    if (modules.length > 0) out.push({ area, modules });
  }
  return out;
}

/** Ruta de Coordinación para un módulo, si existe en el mapa. */
export function coordPathFor(key: ModuleKey): CoordPath | null {
  for (const area of COORD_AREAS) {
    const m = (area.modules as readonly CoordModule[]).find((x) => x.key === key);
    if (m) return m.to;
  }
  return null;
}

export function coordLabelFor(m: CoordModule): string | undefined {
  return "label" in m ? m.label : undefined;
}
