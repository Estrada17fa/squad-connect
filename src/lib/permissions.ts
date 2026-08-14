import { MODULES, MODULE_MAP, type ModuleKey } from "./modules";

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

/**
 * Módulos donde 'vista_jugador' significa "solo lo mío" (el resto muestra el
 * contenido de su categoría en modo lectura). Se deriva de la definición del
 * módulo para no mantener dos listas.
 */
export const PERSONAL_MODULES: ModuleKey[] = MODULES.filter(
  (m) => m.playerView === "mine",
).map((m) => m.key);

export function isPersonalModule(key: ModuleKey): boolean {
  return MODULE_MAP[key]?.playerView === "mine";
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

/**
 * Módulos de GESTIÓN pura: los niveles de jugador y de lector por categoría no
 * alcanzan para verlos. En Viajes la información personal del jugador (su
 * citación, su vuelo, su pase) se mostrará desde Agenda/Inicio, no aquí.
 */
export const MANAGEMENT_ONLY_MODULES: ModuleKey[] = ["viajes"];

/** ¿El módulo aparece en la navegación y en sus rutas? */
export function canSeeModule(key: ModuleKey, level: PermissionLevel | undefined | null): boolean {
  const l = normalizeLevel(level);
  if (MANAGEMENT_ONLY_MODULES.includes(key)) return LEVEL_RANK[l] >= LEVEL_RANK.lector_global;
  return canRead(l);
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

/* ------------------------------------------------------------------ */
/* Opciones de nivel según el módulo                                   */
/* ------------------------------------------------------------------ */

export interface LevelOption {
  value: PermissionLevel;
  label: string;
  hint: string;
}

const HINTS: Record<PermissionLevel, string> = {
  sin_acceso: "El módulo no aparece para esta persona.",
  vista_jugador: "Solo ve lo suyo. Nunca edita.",
  lector_categoria: "Ve todo lo de sus categorías. No edita.",
  lector_global: "Ve todo el club. No edita.",
  editor_categoria: "Ve y edita en sus categorías.",
  editor_global: "Ve y edita en todo el club.",
};

/**
 * Niveles disponibles: TODOS los módulos ofrecen los 6 niveles, sin recortes
 * por ámbito. Elegir un nivel de categoría en un módulo de club limita lo que
 * la persona ve a los registros de sus categorías (y a los marcados como
 * "Todo el club").
 */
export function levelOptionsFor(key: ModuleKey): LevelOption[] {
  return PERMISSION_LEVELS.map((value) => ({
    value,
    label: LEVEL_LABEL[value],
    hint: value === "vista_jugador" ? playerViewHint(key) : HINTS[value],
  }));
}

/** Texto de ayuda de 'vista_jugador' según lo que muestra el módulo. */
export function playerViewHint(key: ModuleKey): string {
  return MODULE_MAP[key]?.playerView === "mine"
    ? "Solo ve lo suyo (sus registros). Nunca edita."
    : "Ve el contenido de su categoría en modo lectura. Nunca edita.";
}

/** Ajusta un nivel guardado a una opción válida del módulo (para el <Select>). */
export function coerceLevelFor(_key: ModuleKey, level: PermissionLevel): PermissionLevel {
  return level;
}


/* ------------------------------------------------------------------ */
/* Valores por defecto de los roles del sistema                        */
/* ------------------------------------------------------------------ */

export const DEFAULT_ROLE_LEVELS: Record<string, Record<ModuleKey, PermissionLevel>> = {
  admin: {
    agenda: "editor_global", mes: "editor_global", plantel: "editor_global",
    viajes: "editor_global", inventario: "editor_global", coordinacion_interna: "editor_global",
    partidos: "editor_global",
    solicitudes: "editor_global", compras_facturas: "editor_global", documentos: "editor_global",
    usuarios: "editor_global", comunicados: "editor_global", multimedia: "editor_global",
    torneo: "editor_global", tacticas: "editor_global", salud: "editor_global",
    desarrollo: "editor_global", entrenamientos: "editor_global", nutricion: "editor_global",
  },
  tecnico: {
    agenda: "editor_categoria", mes: "editor_categoria", plantel: "editor_categoria",
    viajes: "lector_categoria", inventario: "lector_global", coordinacion_interna: "editor_global",
    partidos: "editor_categoria",
    solicitudes: "lector_global", compras_facturas: "sin_acceso", documentos: "lector_categoria",
    usuarios: "sin_acceso", comunicados: "editor_categoria", multimedia: "lector_categoria",
    torneo: "editor_categoria", tacticas: "editor_categoria", salud: "sin_acceso",
    desarrollo: "editor_categoria", entrenamientos: "editor_categoria", nutricion: "sin_acceso",
  },
  medico: {
    agenda: "lector_categoria", mes: "lector_categoria", plantel: "lector_categoria",
    viajes: "lector_categoria", inventario: "lector_global", coordinacion_interna: "lector_global",
    partidos: "lector_categoria",
    solicitudes: "lector_global", compras_facturas: "sin_acceso", documentos: "lector_categoria",
    usuarios: "sin_acceso", comunicados: "lector_categoria", multimedia: "lector_categoria",
    torneo: "lector_categoria", tacticas: "sin_acceso", salud: "editor_categoria",
    desarrollo: "sin_acceso", entrenamientos: "lector_categoria", nutricion: "editor_categoria",
  },
  staff: {
    agenda: "lector_categoria", mes: "lector_categoria", plantel: "lector_categoria",
    viajes: "editor_categoria", inventario: "editor_global", coordinacion_interna: "lector_global",
    partidos: "lector_categoria",
    solicitudes: "editor_global", compras_facturas: "editor_global", documentos: "lector_categoria",
    usuarios: "sin_acceso", comunicados: "lector_categoria", multimedia: "lector_categoria",
    torneo: "lector_categoria", tacticas: "sin_acceso", salud: "sin_acceso",
    desarrollo: "sin_acceso", entrenamientos: "lector_categoria", nutricion: "sin_acceso",
  },
  jugador: {
    agenda: "vista_jugador", mes: "vista_jugador", plantel: "vista_jugador",
    viajes: "vista_jugador", inventario: "sin_acceso", coordinacion_interna: "sin_acceso",
    partidos: "vista_jugador",
    solicitudes: "lector_global", compras_facturas: "sin_acceso", documentos: "sin_acceso",
    usuarios: "sin_acceso", comunicados: "vista_jugador", multimedia: "vista_jugador",
    torneo: "vista_jugador", tacticas: "vista_jugador", salud: "vista_jugador",
    desarrollo: "vista_jugador", entrenamientos: "vista_jugador", nutricion: "vista_jugador",
  },
};

export function defaultLevelsFor(baseRole: string | null | undefined): Record<ModuleKey, PermissionLevel> | null {
  const key = (baseRole ?? "").toLowerCase();
  return DEFAULT_ROLE_LEVELS[key] ?? null;
}

/* ------------------------------------------------------------------ */
/* Reglas propias del módulo `usuarios`                                */
/* ------------------------------------------------------------------ */

/**
 * El módulo Usuarios solo existe a partir de nivel global: gestionar personas
 * es sensible y no tiene sentido "por categoría".
 * sin_acceso / vista_jugador / lector_categoria => no ve el módulo.
 */
export function canSeeUsers(level: PermissionLevel | undefined | null): boolean {
  return LEVEL_RANK[normalizeLevel(level)] >= LEVEL_RANK.lector_global;
}

/** Solo Editor global administra usuarios (crear, editar, baja, roles). */
export function canManageUsers(level: PermissionLevel | undefined | null): boolean {
  return normalizeLevel(level) === "editor_global";
}
