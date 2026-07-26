import { Home, Calendar, Users, MessagesSquare, User, type LucideIcon } from "lucide-react";
import { MODULE_MAP, type ModuleKey, MODULES } from "./modules";

export type PageKey = "home" | "agenda" | "club" | "coordinacion" | "avatar";
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
  { key: "avatar", label: "Yo", icon: User, to: "/yo" },
];

export const PAGE_MAP: Record<PageKey, PageDef> = Object.fromEntries(
  PAGES.map((p) => [p.key, p]),
) as Record<PageKey, PageDef>;

/**
 * Mapping per base role: which modules render inside each of the 5 pages.
 * "calendario" always goes on Agenda (embedded), never here.
 * "coordinacion_interna" (Tareas/Juntas) lives inside Coordinación.
 */
const ROLE_PAGES: Record<BaseRole, Record<PageKey, ModuleKey[]>> = {
  admin: {
    home: [],
    agenda: [],
    club: ["plantel", "salud", "desarrollo", "tacticas", "torneo", "comunicados", "multimedia", "uniformes"],
    coordinacion: ["coordinacion_interna", "solicitudes", "inventario", "viajes"],
    avatar: ["usuarios", "documentos"],
  },
  tecnico: {
    home: [],
    agenda: [],
    club: ["plantel", "desarrollo", "tacticas", "torneo", "comunicados", "multimedia"],
    coordinacion: ["coordinacion_interna", "solicitudes", "viajes"],
    avatar: [],
  },
  medico: {
    home: [],
    agenda: [],
    club: ["plantel", "salud", "comunicados", "multimedia"],
    coordinacion: ["coordinacion_interna", "solicitudes"],
    avatar: [],
  },
  staff: {
    home: [],
    agenda: [],
    club: ["plantel", "comunicados", "multimedia", "uniformes"],
    coordinacion: ["coordinacion_interna", "solicitudes", "inventario", "viajes"],
    avatar: [],
  },
  jugador: {
    home: [],
    agenda: [],
    club: ["plantel", "desarrollo", "torneo", "comunicados", "multimedia"],
    // Jugador: Coordinación se transforma en "Mis Solicitudes" (ver JUGADOR_COORDINACION_LABEL).
    coordinacion: ["solicitudes"],
    avatar: [],
  },
};

/** Fallback global: si un rol custom activa un módulo que su rol base no incluye, cae aquí. */
const DEFAULT_PAGE_FOR_MODULE: Record<ModuleKey, PageKey> = {
  calendario: "agenda",
  plantel: "club",
  salud: "club",
  desarrollo: "club",
  tacticas: "club",
  torneo: "club",
  comunicados: "club",
  multimedia: "club",
  uniformes: "club",
  coordinacion_interna: "coordinacion",
  solicitudes: "coordinacion",
  inventario: "coordinacion",
  viajes: "coordinacion",
  usuarios: "avatar",
  documentos: "avatar",
};

export interface ResolvedPage {
  page: PageDef;
  modules: ModuleKey[];
  /** Etiqueta especial: jugador ve "Mis Solicitudes" en el slot de Coordinación. */
  labelOverride?: string;
  variant?: "jugador-solicitudes";
}

/**
 * Devuelve las páginas visibles y qué módulos aparecen en cada una,
 * combinando: (1) el mapping del rol base, (2) el catálogo global,
 * (3) los módulos a los que el usuario realmente tiene acceso.
 */
export function resolvePagesForUser(
  baseRole: BaseRole | null,
  accessibleModules: ModuleKey[],
): ResolvedPage[] {
  const role = baseRole ?? "staff";
  const roleMap = ROLE_PAGES[role];
  const accessible = new Set<ModuleKey>(accessibleModules);

  // Base per-page module lists (intersection with what user actually has)
  const perPage: Record<PageKey, ModuleKey[]> = {
    home: [],
    agenda: [],
    club: [],
    coordinacion: [],
    avatar: [],
  };

  // 1) Mapping del rol base (respeta orden definido)
  for (const p of PAGES) {
    for (const mk of roleMap[p.key]) {
      if (accessible.has(mk) && !perPage[p.key].includes(mk)) perPage[p.key].push(mk);
    }
  }

  // 2) Fallback: módulos accesibles que el rol base no mapeó → van a su página por defecto
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
    // Home siempre visible
    if (p.key === "home") {
      out.push({ page: p, modules: [] });
      continue;
    }
    // Agenda visible si el usuario tiene calendario
    if (p.key === "agenda") {
      if (accessible.has("calendario")) out.push({ page: p, modules: ["calendario"] });
      continue;
    }
    // Avatar siempre visible (perfil personal)
    if (p.key === "avatar") {
      out.push({ page: p, modules: perPage.avatar });
      continue;
    }
    // Coordinación: caso especial jugador
    if (p.key === "coordinacion" && role === "jugador") {
      // Aunque no tenga módulo "solicitudes", igual mostramos "Mis Solicitudes" como puerta.
      out.push({
        page: p,
        modules: perPage.coordinacion,
        labelOverride: "Mis Solicitudes",
        variant: "jugador-solicitudes",
      });
      continue;
    }
    // Resto: mostrar solo si hay módulos
    if (perPage[p.key].length > 0) {
      out.push({ page: p, modules: perPage[p.key] });
    }
  }

  return out;
}

/** Utilidad: derivar baseRole desde el nombre del rol (fallback si backend no lo entrega). */
export function inferBaseRole(roleName: string | null | undefined): BaseRole {
  const n = (roleName ?? "").toLowerCase().trim();
  if (n === "admin") return "admin";
  if (n === "técnico" || n === "tecnico") return "tecnico";
  if (n === "médico" || n === "medico") return "medico";
  if (n === "jugador") return "jugador";
  return "staff";
}

/** Todos los módulos existentes (para docs / referencia). */
export const ALL_MODULE_KEYS: ModuleKey[] = MODULES.map((m) => m.key);
