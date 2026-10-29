import {
  Calendar,
  CalendarClock,
  Users,
  Plane,
  Package,
  MessagesSquare,
  ClipboardList,
  FileText,
  UserCog,
  Megaphone,
  Image as ImageIcon,
  Trophy,
  LayoutGrid,
  HeartPulse,
  TrendingUp,
  Apple,
  Dumbbell,
  Receipt,
  Volleyball,
  Home,
  Wallet,
  ShoppingCart,
  ClipboardCheck,
  type LucideIcon,
} from "lucide-react";

export type ModuleKey =
  | "agenda"
  | "mes"
  | "plantel"
  | "viajes"
  | "inventario"
  | "coordinacion_interna"
  | "partidos"
  | "solicitudes"
  | "compras_facturas"
  | "documentos"
  | "usuarios"
  | "comunicados"
  | "multimedia"
  /**
   * Entrada de navegación de GESTIÓN de multimedia dentro de la página
   * Coordinación. No es un permiso propio: se resuelve contra `multimedia`
   * (ver `permissionKeyFor`) y por eso no aparece en las matrices de permisos.
   */
  | "multimedia_gestion"
  | "torneo"
  | "tacticas"
  | "salud"
  | "desarrollo"
  | "entrenamientos"
  | "nutricion"
  | "finanzas"
  | "compras"
  | "operacion_partido";

/** Áreas de la página Coordinación. */
export type CoordArea = "general" | "administrativa" | "operacional" | "tecnica" | "medica";

export const COORD_AREAS: { key: CoordArea; label: string }[] = [
  { key: "general", label: "General" },
  { key: "administrativa", label: "Administrativa" },
  { key: "operacional", label: "Operacional" },
  { key: "tecnica", label: "Técnica" },
  { key: "medica", label: "Médica" },
];

/**
 * Fuente única: qué módulo (entrada de navegación) va en qué área de
 * Coordinación y en qué orden. Mover un módulo = mover una línea.
 */
export const COORD_LAYOUT: Record<CoordArea, ModuleKey[]> = {
  general: ["coordinacion_interna", "comunicados", "multimedia_gestion", "solicitudes"],
  administrativa: ["finanzas", "compras", "documentos"],
  operacional: ["operacion_partido", "viajes", "inventario"],
  tecnica: ["entrenamientos", "partidos", "desarrollo", "plantel", "torneo"],
  medica: ["salud", "nutricion"],
};

/** Módulos que solo tienen "Con acceso / Sin acceso". */
export const TOGGLE_MODULES: ModuleKey[] = ["usuarios"];

/** Módulos aún en construcción: muestran el aviso "En desarrollo". */
export const COMING_SOON_MODULES: ModuleKey[] = [
  "finanzas", "compras", "operacion_partido", "desarrollo", "plantel", "torneo", "salud", "nutricion",
];

/** Módulos guardados (código y datos intactos) pero fuera de la navegación y las matrices. */
export const RETIRED_MODULES: ModuleKey[] = ["compras_facturas", "tacticas", "agenda", "mes"];

export function coordAreaOf(key: ModuleKey): CoordArea | null {
  for (const a of COORD_AREAS) if (COORD_LAYOUT[a.key].includes(key)) return a.key;
  return null;
}

/**
 * Ámbito de datos del módulo:
 * - "team": estricto por categoría (usa el equipo activo del header).
 * - "club": nivel club (ignora el selector de equipo).
 * - "mixed": combina datos del club y del equipo activo.
 */
export type ModuleScope = "team" | "club" | "mixed";

/**
 * Qué significa el nivel `vista_jugador` en este módulo:
 * - "mine": solo los registros donde la persona es el sujeto (sus datos,
 *   sus convocatorias, sus solicitudes).
 * - "team": contenido de su categoría en modo lectura, sin datos
 *   administrativos ni de otras personas.
 */
export type PlayerViewMode = "mine" | "team";

export interface ModuleDef {
  key: ModuleKey;
  label: string;
  icon: LucideIcon;
  description: string;
  scope: ModuleScope;
  /** Vista de jugador soportada por el módulo (siempre definida). */
  playerView: PlayerViewMode;
}

export const MODULES: ModuleDef[] = [
  { key: "agenda", label: "Agenda", icon: CalendarClock, description: "Próximos eventos en lista", scope: "mixed" , playerView: "mine" },
  { key: "mes", label: "Mes", icon: Calendar, description: "Vista mensual de eventos", scope: "mixed" , playerView: "mine" },
  { key: "plantel", label: "Plantel", icon: Users, description: "Jugadores y cuerpo técnico", scope: "team" , playerView: "mine" },
  { key: "viajes", label: "Viajes", icon: Plane, description: "Logística de traslados y hospedajes", scope: "mixed" , playerView: "mine" },
  { key: "inventario", label: "Inventario", icon: Package, description: "Material deportivo y equipamiento", scope: "mixed" , playerView: "mine" },
  { key: "coordinacion_interna", label: "Coordinación", icon: MessagesSquare, description: "Comunicación interna del staff", scope: "club" , playerView: "mine" },
  { key: "partidos", label: "Partidos", icon: Volleyball, description: "Convocatoria y logística de nuestros partidos", scope: "team" , playerView: "mine" },
  { key: "solicitudes", label: "Solicitudes", icon: ClipboardList, description: "Aprobaciones y peticiones", scope: "club" , playerView: "mine" },
  { key: "compras_facturas", label: "Compras y facturas", icon: Receipt, description: "Compras, pagos a proveedores y reembolsos", scope: "club" , playerView: "mine" },
  { key: "documentos", label: "Documentos", icon: FileText, description: "Contratos y archivos del club", scope: "club" , playerView: "mine" },
  { key: "usuarios", label: "Usuarios", icon: UserCog, description: "Miembros, roles y permisos", scope: "club" , playerView: "mine" },
  { key: "comunicados", label: "Comunicados", icon: Megaphone, description: "Avisos oficiales del club", scope: "club" , playerView: "team" },
  { key: "multimedia", label: "Multimedia", icon: ImageIcon, description: "Fotos y videos", scope: "team" , playerView: "team" },
  { key: "torneo", label: "Torneo", icon: Trophy, description: "Competencias y clasificaciones", scope: "team" , playerView: "team" },
  { key: "tacticas", label: "Tácticas", icon: LayoutGrid, description: "Formaciones y jugadas", scope: "team" , playerView: "team" },
  { key: "salud", label: "Salud", icon: HeartPulse, description: "Parte médico y lesiones", scope: "team" , playerView: "mine" },
  { key: "desarrollo", label: "Desarrollo", icon: TrendingUp, description: "Evaluaciones y progresos", scope: "team" , playerView: "mine" },
  { key: "entrenamientos", label: "Entrenamientos", icon: Dumbbell, description: "Sesiones del equipo y biblioteca de ejercicios", scope: "team" , playerView: "team" },
  { key: "nutricion", label: "Nutrición", icon: Apple, description: "Planes alimenticios", scope: "team" , playerView: "mine" },
  { key: "finanzas", label: "Finanzas", icon: Wallet, description: "Presupuesto y finanzas del club", scope: "club", playerView: "mine" },
  { key: "compras", label: "Compras", icon: ShoppingCart, description: "Compras del club", scope: "club", playerView: "mine" },
  { key: "operacion_partido", label: "Operación de partido", icon: ClipboardCheck, description: "Operación el día de partido", scope: "team", playerView: "mine" },
];

/**
 * Entradas de navegación que NO son un permiso propio: reutilizan el
 * `module_key` de otro módulo. Se excluyen de `MODULES` para que no aparezcan
 * en las matrices de permisos ni en `accessibleModules`.
 */
export const NAV_ALIAS_MODULES: ModuleDef[] = [
  { key: "multimedia_gestion", label: "Multimedia", icon: ImageIcon, description: "Subir y gestionar fotos y videos", scope: "team", playerView: "team" },
];

const NAV_ALIAS_PERMISSION: Partial<Record<ModuleKey, ModuleKey>> = {
  multimedia_gestion: "multimedia",
};

/** Módulo de permisos real detrás de una entrada de navegación. */
export function permissionKeyFor(key: ModuleKey): ModuleKey {
  return NAV_ALIAS_PERMISSION[key] ?? key;
}

/** ¿La entrada es solo navegación (alias de otro módulo)? */
export function isNavAlias(key: ModuleKey): boolean {
  return key in NAV_ALIAS_PERMISSION;
}

export const MODULE_MAP: Record<ModuleKey, ModuleDef> = Object.fromEntries(
  [...MODULES, ...NAV_ALIAS_MODULES].map((m) => [m.key, m]),
) as Record<ModuleKey, ModuleDef>;

export const HOME_MODULE: { key: "home"; label: string; icon: LucideIcon } = {
  key: "home",
  label: "Inicio",
  icon: Home,
};

/** Devuelve la clave del módulo activo a partir del pathname (o null). */
export function moduleFromPath(pathname: string): ModuleKey | null {
  const m = pathname.match(/^\/m\/([a-z_]+)/);
  if (!m) return null;
  return (MODULE_MAP[m[1] as ModuleKey] ? (m[1] as ModuleKey) : null);
}
