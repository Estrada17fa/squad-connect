import { MODULES, MODULE_MAP, RETIRED_MODULES, TOGGLE_MODULES, type ModuleKey } from "./modules";

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
 * alcanzan para verlos. Viajes ya NO está aquí: con cualquier nivel de lectura
 * se ve la pestaña de consulta en Agenda (su citación, vuelo, hotel, pase);
 * el módulo de gestión en Coordinación se filtra con `canManageTripsModule`.
 */
export const MANAGEMENT_ONLY_MODULES: ModuleKey[] = [];

/** ¿El módulo aparece en la navegación y en sus rutas? */
export function canSeeModule(key: ModuleKey, level: PermissionLevel | undefined | null): boolean {
  const l = normalizeLevel(level);
  if (MANAGEMENT_ONLY_MODULES.includes(key)) return LEVEL_RANK[l] >= LEVEL_RANK.lector_global;
  return canRead(l);
}

/**
 * Acceso al MÓDULO de gestión de viajes (chip en Coordinación, `/m/viajes`):
 * requiere nivel global de lectura o superior. La consulta personal del viaje
 * vive en la pestaña Viajes de Agenda y solo pide lectura.
 */
export function canManageTripsModule(level: PermissionLevel | undefined | null): boolean {
  return LEVEL_RANK[normalizeLevel(level)] >= LEVEL_RANK.lector_categoria;
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
 * Escala simplificada que ve el administrador:
 * - Módulos de Coordinación: Sin acceso / Ver / Editor.
 * - Módulos "toggle" (Usuarios): Sin acceso / Con acceso.
 * "Ver" y "Editor" siempre se limitan a las categorías asignadas; con la
 * membresía "Todo el club" la base los amplía a todo el club.
 * Para el rol Jugador, "Ver" = vista de jugador (solo lo suyo).
 */
export function isToggleModule(key: ModuleKey): boolean {
  return TOGGLE_MODULES.includes(key);
}

function viewLevelFor(baseRole?: string | null): PermissionLevel {
  return (baseRole ?? "").toLowerCase() === "jugador" ? "vista_jugador" : "lector_categoria";
}

export function levelOptionsFor(key: ModuleKey, baseRole?: string | null): LevelOption[] {
  if (isToggleModule(key)) {
    return [
      { value: "sin_acceso", label: "Sin acceso", hint: "El módulo no aparece." },
      { value: "editor_categoria", label: "Con acceso", hint: "Ve y usa el módulo." },
    ];
  }
  const view = viewLevelFor(baseRole);
  return [
    { value: "sin_acceso", label: "Sin acceso", hint: "El módulo no aparece." },
    {
      value: view,
      label: "Ver",
      hint: view === "vista_jugador" ? playerViewHint(key) : "Ve lo de sus categorías. No edita.",
    },
    { value: "editor_categoria", label: "Editor", hint: "Ve y edita en sus categorías." },
  ];
}

/** Texto corto del nivel en la escala simplificada. */
export function simpleLevelLabel(key: ModuleKey, level: PermissionLevel | null | undefined): string {
  const l = normalizeLevel(level);
  if (l === "sin_acceso") return "Sin acceso";
  if (isToggleModule(key)) return "Con acceso";
  return canEdit(l) ? "Editor" : "Ver";
}

/** Texto de ayuda de 'vista_jugador' según lo que muestra el módulo. */
export function playerViewHint(key: ModuleKey): string {
  return MODULE_MAP[key]?.playerView === "mine"
    ? "Solo ve lo suyo (sus registros). Nunca edita."
    : "Ve el contenido de su categoría en modo lectura. Nunca edita.";
}

/** Ajusta un nivel guardado a una opción válida de la escala simplificada. */
export function coerceLevelFor(key: ModuleKey, level: PermissionLevel, baseRole?: string | null): PermissionLevel {
  if (RETIRED_MODULES.includes(key)) return level;
  const l = normalizeLevel(level);
  if (l === "sin_acceso") return l;
  if (isToggleModule(key)) return "editor_categoria";
  if (canEdit(l)) return "editor_categoria";
  return viewLevelFor(baseRole);
}


/* ------------------------------------------------------------------ */
/* Valores por defecto de los roles del sistema                        */
/* ------------------------------------------------------------------ */

const E: PermissionLevel = "editor_categoria";
const V: PermissionLevel = "lector_categoria";
const J: PermissionLevel = "vista_jugador";
const N: PermissionLevel = "sin_acceso";

export const DEFAULT_ROLE_LEVELS: Record<string, Partial<Record<ModuleKey, PermissionLevel>>> = {
  admin: Object.fromEntries(
    MODULES.filter((m) => !RETIRED_MODULES.includes(m.key)).map((m) => [m.key, E]),
  ) as Partial<Record<ModuleKey, PermissionLevel>>,
  // General: Tareas/juntas, Comunicados, Multimedia, Solicitudes
  tecnico: {
    coordinacion_interna: E, comunicados: E, multimedia: E, solicitudes: E,
    finanzas: N, compras: N, documentos: N,
    operacion_partido: V, viajes: V, inventario: V,
    entrenamientos: E, partidos: E, desarrollo: E, plantel: E, torneo: E,
    salud: N, nutricion: N, usuarios: N,
  },
  medico: {
    coordinacion_interna: V, comunicados: V, multimedia: V, solicitudes: V,
    finanzas: N, compras: N, documentos: N,
    operacion_partido: N, viajes: N, inventario: N,
    entrenamientos: N, partidos: N, desarrollo: N, plantel: N, torneo: N,
    salud: E, nutricion: E, usuarios: N,
  },
  staff: {
    coordinacion_interna: V, comunicados: V, multimedia: V, solicitudes: V,
    finanzas: N, compras: N, documentos: N,
    operacion_partido: E, viajes: E, inventario: E,
    entrenamientos: N, partidos: N, desarrollo: N, plantel: N, torneo: N,
    salud: N, nutricion: N, usuarios: N,
  },
  jugador: {
    coordinacion_interna: N, comunicados: J, multimedia: J, solicitudes: N,
    finanzas: N, compras: N, documentos: N,
    operacion_partido: N, viajes: N, inventario: N,
    entrenamientos: N, partidos: N, desarrollo: N, plantel: N, torneo: N,
    salud: N, nutricion: N, usuarios: N,
  },
};


export function defaultLevelsFor(baseRole: string | null | undefined): Partial<Record<ModuleKey, PermissionLevel>> | null {
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
