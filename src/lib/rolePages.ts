import { Home, Calendar, Users, MessagesSquare, Shield, type LucideIcon } from "lucide-react";
import { MODULES, MODULE_MAP, type ModuleKey } from "./modules";

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
  { key: "club", label: "Mi Club", icon: Users, to: "/mi-club" },
  { key: "coordinacion", label: "Coordinación", icon: MessagesSquare, to: "/coordinacion" },
  { key: "admin", label: "Admin", icon: Shield, to: "/admin" },
];

export const PAGE_MAP: Record<PageKey, PageDef> = Object.fromEntries(
  PAGES.map((p) => [p.key, p]),
) as Record<PageKey, PageDef>;

const ROLE_PAGES: Record<BaseRole, Record<PageKey, ModuleKey[]>> = {
  admin: {
    home: [],
    agenda: [],
    club: ["plantel", "salud", "desarrollo", "tacticas", "torneo", "comunicados", "multimedia"],
    coordinacion: ["coordinacion_interna", "solicitudes", "inventario", "viajes"],
    admin: ["usuarios", "documentos"],
  },
  tecnico: {
    home: [],
    agenda: [],
    club: ["plantel", "desarrollo", "tacticas", "torneo", "comunicados", "multimedia"],
    coordinacion: ["coordinacion_interna", "solicitudes", "viajes"],
    admin: [],
  },
  medico: {
    home: [],
    agenda: [],
    club: ["plantel", "salud", "comunicados", "multimedia"],
    coordinacion: ["coordinacion_interna", "solicitudes"],
    admin: [],
  },
  staff: {
    home: [],
    agenda: [],
    club: ["plantel", "comunicados", "multimedia"],
    coordinacion: ["coordinacion_interna", "solicitudes", "inventario", "viajes"],
    admin: [],
  },
  jugador: {
    home: [],
    agenda: [],
    club: ["plantel", "desarrollo", "torneo", "comunicados", "multimedia"],
    coordinacion: ["solicitudes"],
    admin: [],
  },
};

const DEFAULT_PAGE_FOR_MODULE: Record<ModuleKey, PageKey> = {
  calendario: "agenda",
  plantel: "club",
  salud: "club",
  desarrollo: "club",
  tacticas: "club",
  torneo: "club",
  comunicados: "club",
  multimedia: "club",
  
  nutricion: "club",
  coordinacion_interna: "coordinacion",
  solicitudes: "coordinacion",
  inventario: "coordinacion",
  viajes: "coordinacion",
  usuarios: "admin",
  documentos: "admin",
};

export interface ResolvedPage {
  page: PageDef;
  modules: ModuleKey[];
  labelOverride?: string;
  variant?: "jugador-solicitudes";
}

export function resolvePagesForUser(
  baseRole: BaseRole | null,
  accessibleModules: ModuleKey[],
): ResolvedPage[] {
  const role = baseRole ?? "staff";
  const roleMap = ROLE_PAGES[role];
  const accessible = new Set<ModuleKey>(accessibleModules);

  const perPage: Record<PageKey, ModuleKey[]> = {
    home: [], agenda: [], club: [], coordinacion: [], admin: [],
  };

  for (const p of PAGES) {
    for (const mk of roleMap[p.key]) {
      if (accessible.has(mk) && !perPage[p.key].includes(mk)) perPage[p.key].push(mk);
    }
  }

  const placed = new Set<ModuleKey>(Object.values(perPage).flat());
  for (const mk of accessibleModules) {
    if (placed.has(mk)) continue;
    const dest = DEFAULT_PAGE_FOR_MODULE[mk];
    if (dest && dest !== "home" && dest !== "agenda") {
      perPage[dest].push(mk);
    }
  }

  const out: ResolvedPage[] = [];
  for (const p of PAGES) {
    if (p.key === "home") { out.push({ page: p, modules: [] }); continue; }
    if (p.key === "agenda") {
      if (accessible.has("calendario")) out.push({ page: p, modules: ["calendario"] });
      continue;
    }
    if (p.key === "admin") {
      if (role === "admin") out.push({ page: p, modules: perPage.admin });
      continue;
    }
    if (p.key === "coordinacion" && role === "jugador") {
      out.push({
        page: p,
        modules: perPage.coordinacion,
        labelOverride: "Mis Solicitudes",
        variant: "jugador-solicitudes",
      });
      continue;
    }
    if (perPage[p.key].length > 0) {
      out.push({ page: p, modules: perPage[p.key] });
    }
  }

  return out;
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

/**
 * Devuelve el hub (Mi Club, Coordinación, Admin, ...) al que pertenece un módulo
 * dentro de la navegación del usuario actual, junto con sus módulos hermanos.
 */
export function findHubForModule(
  visiblePages: ResolvedPage[],
  moduleKey: ModuleKey,
): ResolvedPage | null {
  return visiblePages.find((p) => p.modules.includes(moduleKey)) ?? null;
}
