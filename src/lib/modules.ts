import {
  Calendar,
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
  Home,
  type LucideIcon,
} from "lucide-react";

export type ModuleKey =
  | "calendario"
  | "plantel"
  | "viajes"
  | "inventario"
  | "coordinacion_interna"
  | "solicitudes"
  | "documentos"
  | "usuarios"
  | "comunicados"
  | "multimedia"
  | "torneo"
  | "tacticas"
  | "salud"
  | "desarrollo"
  | "nutricion"
  | "nutricion";

/**
 * Ámbito de datos del módulo:
 * - "team": estricto por categoría (usa el equipo activo del header).
 * - "club": nivel club (ignora el selector de equipo).
 * - "mixed": combina datos del club y del equipo activo.
 */
export type ModuleScope = "team" | "club" | "mixed";

export interface ModuleDef {
  key: ModuleKey;
  label: string;
  icon: LucideIcon;
  description: string;
  scope: ModuleScope;
}

export const MODULES: ModuleDef[] = [
  { key: "calendario", label: "Calendario", icon: Calendar, description: "Partidos, entrenamientos y eventos", scope: "mixed" },
  { key: "plantel", label: "Plantel", icon: Users, description: "Jugadores y cuerpo técnico", scope: "team" },
  { key: "viajes", label: "Viajes", icon: Plane, description: "Logística de traslados y hospedajes", scope: "mixed" },
  { key: "inventario", label: "Inventario", icon: Package, description: "Material deportivo y equipamiento", scope: "mixed" },
  { key: "coordinacion_interna", label: "Coordinación", icon: MessagesSquare, description: "Comunicación interna del staff", scope: "club" },
  { key: "solicitudes", label: "Solicitudes", icon: ClipboardList, description: "Aprobaciones y peticiones", scope: "club" },
  { key: "documentos", label: "Documentos", icon: FileText, description: "Contratos y archivos del club", scope: "club" },
  { key: "usuarios", label: "Usuarios", icon: UserCog, description: "Miembros, roles y permisos", scope: "club" },
  { key: "comunicados", label: "Comunicados", icon: Megaphone, description: "Avisos oficiales del club", scope: "club" },
  { key: "multimedia", label: "Multimedia", icon: ImageIcon, description: "Fotos y videos", scope: "team" },
  { key: "torneo", label: "Torneo", icon: Trophy, description: "Competencias y clasificaciones", scope: "club" },
  { key: "tacticas", label: "Tácticas", icon: LayoutGrid, description: "Formaciones y jugadas", scope: "team" },
  { key: "salud", label: "Salud", icon: HeartPulse, description: "Parte médico y lesiones", scope: "team" },
  { key: "desarrollo", label: "Desarrollo", icon: TrendingUp, description: "Evaluaciones y progresos", scope: "team" },
  { key: "nutricion", label: "Nutrición", icon: Apple, description: "Planes alimenticios", scope: "team" },
  
];

export const MODULE_MAP: Record<ModuleKey, ModuleDef> = Object.fromEntries(
  MODULES.map((m) => [m.key, m]),
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
