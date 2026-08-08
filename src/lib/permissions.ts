import { MODULE_MAP, type ModuleKey } from "./modules";

/**
 * Escala nueva de permisos (tipo `permission_level` en la base).
 *
 * - sin_acceso        → el módulo no existe para el usuario.
 * - vista_jugador     → ve "lo suyo" en módulos personales; en el resto, lo de su categoría. Nunca edita.
 * - lector_categoria  → lee todo lo de sus equipos.
 * - lector_global     → lee todo el club (cualquier equipo).
 * - editor_categoria  → lee y edita en sus equipos.
 * - editor_global     → lee y edita en cualquier equipo del club.
 */
export type PermissionLevel =
  | "sin_acceso"
  | "vista_jugador"
  | "lector_categoria"
  | "lector_global"
  | "editor_categoria"
  | "editor_global";

export const PERMISSION_LEVELS: PermissionLevel[] = [
  "sin_acceso",
  "vista_jugador",
  "lector_categoria",
  "lector_global",
  "editor_categoria",
  "editor_global",
];

export const LEVEL_RANK: Record<PermissionLevel, number> = {
  sin_acceso: 0,
  vista_jugador: 1,
  lector_categoria: 2,
  lector_global: 3,
  editor_categoria: 4,
  editor_global: 5,
};

export const LEVEL_LABEL: Record<PermissionLevel, string> = {
  sin_acceso: "Sin acceso",
  vista_jugador: "Vista jugador",
  lector_categoria: "Lector de su categoría",
  lector_global: "Lector global",
  editor_categoria: "Editor de su categoría",
  editor_global: "Editor global",
};

/** Módulos con datos personales: 'vista_jugador' significa "solo lo mío". */
export const PERSONAL_MODULES: ModuleKey[] = ["salud", "desarrollo", "nutricion"];

export function isPersonalModule(key: ModuleKey): boolean {
  return PERSONAL_MODULES.includes(key);
}

export function normalizeLevel(level: unknown): PermissionLevel {
  return typeof level === "string" && level in LEVEL_RANK
    ? (level as PermissionLevel)
    : "sin_acceso";
}

export function maxLevel(
  a: PermissionLevel | undefined | null,
  b: PermissionLevel | undefined | null,
): PermissionLevel {
  const la = normalizeLevel(a);
  const lb = normalizeLevel(b);
  return LEVEL_RANK[la] >= LEVEL_RANK[lb] ? la : lb;
}

/** ¿El módulo aparece / el usuario ve algo? */
export function canRead(level: PermissionLevel | undefined | null): boolean {
  return normalizeLevel(level) !== "sin_acceso";
}

/** ¿Puede crear o editar? */
export function canEdit(level: PermissionLevel | undefined | null): boolean {
  const l = normalizeLevel(level);
  return l === "editor_categoria" || l === "editor_global";
}

/** Los niveles globales aplican a CUALQUIER equipo, incluso a los no asignados. */
export function isGlobalLevel(level: PermissionLevel | undefined | null): boolean {
  const l = normalizeLevel(level);
  return l === "lector_global" || l === "editor_global";
}

/** Modo "solo lo mío" (en módulos personales) o "solo mi categoría" (en el resto). */
export function isPlayerView(level: PermissionLevel | undefined | null): boolean {
  return normalizeLevel(level) === "vista_jugador";
}

/**
 * Puente temporal: la UI de administración de permisos todavía usa la escala
 * vieja de 4 opciones. Al guardar escribe AMBAS columnas para que la app (que
 * ya lee `level`) y la RLS vieja (que lee `access_level`) queden alineadas.
 */
export function legacyToLevel(legacy: string): PermissionLevel {
  switch (legacy) {
    case "read":
      return "lector_categoria";
    case "editor":
    case "approver":
      return "editor_categoria";
    default:
      return "sin_acceso";
  }
}

/** Cubeta vieja equivalente a un nivel nuevo (para comparar sin perder detalle). */
export function levelToLegacy(level: PermissionLevel | undefined | null): "none" | "read" | "editor" {
  const l = normalizeLevel(level);
  if (l === "sin_acceso") return "none";
  return canEdit(l) ? "editor" : "read";
}
