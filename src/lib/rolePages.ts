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
    agenda: ["agenda", "mes"],
    club: ["plantel", "salud", "desarrollo", "nutricion", "tacticas", "torneo", "comunicados", "multimedia"],
    coordinacion: ["coordinacion_interna", "solicitudes", "inventario", "viajes"],
    admin: ["usuarios", "documentos"],
  },
  tecnico: {
    home: [],
    agenda: ["agenda", "mes"],
    club: ["plantel", "desarrollo", "nutricion", "tacticas", "torneo", "comunicados", "multimedia"],
    coordinacion: ["coordinacion_interna", "solicitudes", "viajes"],
    admin: [],
  },
  medico: {
    home: [],
    agenda: ["agenda", "mes"],
    club: ["plantel", "salud", "nutricion", "comunicados", "multimedia"],
    coordinacion: ["coordinacion_interna", "solicitudes"],
    admin: [],
  },
  staff: {
    home: [],
    agenda: ["agenda", "mes"],
    club: ["plantel", "comunicados", "multimedia"],
    coordinacion: ["coordinacion_interna", "solicitudes", "inventario", "viajes"],
    admin: [],
  },
  jugador: {
    home: [],
    agenda: ["agenda", "mes"],
    club: ["plantel", "desarrollo", "nutricion", "torneo", "comunicados", "multimedia"],
    coordinacion: ["solicitudes"],
    admin: [],
  },
};

const DEFAULT_PAGE_FOR_MODULE: Record<ModuleKey, PageKey> = {
  agenda: "agenda",
  mes: "agenda",
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
  accessibleModules: ModuleKey[] | ((key: ModuleKey) => boolean),
): ResolvedPage[] {
  const role = baseRole ?? "staff";
  const roleMap = ROLE_PAGES[role];

  // Fuente de verdad única: un predicado `isAccessible(module)` que se aplica
  // idénticamente al construir la navbar y los chips de módulos.
  const isAccessible: (k: ModuleKey) => boolean = typeof accessibleModules === "function"
    ? accessibleModules
    : ((set) => (k: ModuleKey) => set.has(k))(new Set(accessibleModules));

  const extraModules = Array.isArray(accessibleModules)
    ? accessibleModules
    : ALL_MODULE_KEYS.filter(isAccessible);

  const perPage: Record<PageKey, ModuleKey[]> = {
    home: [], agenda: [], club: [], coordinacion: [], admin: [],
  };

  // 1) Módulos mapeados explícitamente al rol.
  for (const p of PAGES) {
    for (const mk of roleMap[p.key]) {
      if (isAccessible(mk) && !perPage[p.key].includes(mk)) perPage[p.key].push(mk);
    }
  }

  // 2) Cualquier módulo accesible que no esté ya colocado se envía a su página por defecto.
  const placed = new Set<ModuleKey>(Object.values(perPage).flat());
  for (const mk of extraModules) {
    if (placed.has(mk)) continue;
    const dest = DEFAULT_PAGE_FOR_MODULE[mk];
    if (dest && dest !== "home" && dest !== "agenda") {
      perPage[dest].push(mk);
    }
  }

  // 3) Construye la lista final SOLO con páginas que tienen módulos visibles.
  //    Home siempre presente. Cero display:none: si no está en el array, no se renderiza.
  const out: ResolvedPage[] = [];
  for (const p of PAGES) {
    if (p.key === "home") { out.push({ page: p, modules: [] }); continue; }
    if (p.key === "admin") {
      if (role === "admin" && perPage.admin.length > 0) out.push({ page: p, modules: perPage.admin });
      continue;
    }
    if (p.key === "coordinacion" && role === "jugador") {
      if (perPage.coordinacion.length > 0) {
        out.push({
          page: p,
          modules: perPage.coordinacion,
          labelOverride: "Mis Solicitudes",
          variant: "jugador-solicitudes",
        });
      }
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

/**
 * Agrupa módulos por página. Usa el mapa del `base_role` como fuente principal
 * y, para cualquier módulo no listado en ese rol, cae al `DEFAULT_PAGE_FOR_MODULE`.
 * Nunca produce un grupo "Otros": si un módulo no tiene página por defecto, se omite.
 */
export function groupModulesByPage(
  baseRole: BaseRole | null | undefined,
  moduleKeys: ModuleKey[],
): Array<{ page: PageDef; modules: ModuleKey[] }> {
  const role: BaseRole = baseRole ?? "staff";
  const roleMap = ROLE_PAGES[role];
  const set = new Set(moduleKeys);
  const perPage: Record<PageKey, ModuleKey[]> = {
    home: [], agenda: [], club: [], coordinacion: [], admin: [],
  };
  const placed = new Set<ModuleKey>();

  for (const p of PAGES) {
    for (const mk of roleMap[p.key]) {
      if (set.has(mk) && !placed.has(mk)) {
        perPage[p.key].push(mk);
        placed.add(mk);
      }
    }
  }
  for (const mk of moduleKeys) {
    if (placed.has(mk)) continue;
    const dest = DEFAULT_PAGE_FOR_MODULE[mk];
    if (!dest || dest === "home") continue;
    perPage[dest].push(mk);
    placed.add(mk);
  }

  const out: Array<{ page: PageDef; modules: ModuleKey[] }> = [];
  for (const p of PAGES) {
    if (perPage[p.key].length > 0) out.push({ page: p, modules: perPage[p.key] });
  }
  return out;
}
