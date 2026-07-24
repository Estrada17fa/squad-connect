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
  Shirt,
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
  | "uniformes";

export interface ModuleDef {
  key: ModuleKey;
  label: string;
  icon: LucideIcon;
  description: string;
  /** CSS var reference for the module's subtle accent color. */
  accent: string;
}

const acc = (k: ModuleKey) => `var(--module-${k})`;

export const MODULES: ModuleDef[] = [
  { key: "calendario", label: "Calendario", icon: Calendar, description: "Partidos, entrenamientos y eventos", accent: acc("calendario") },
  { key: "plantel", label: "Plantel", icon: Users, description: "Jugadores y cuerpo técnico", accent: acc("plantel") },
  { key: "viajes", label: "Viajes", icon: Plane, description: "Logística de traslados y hospedajes", accent: acc("viajes") },
  { key: "inventario", label: "Inventario", icon: Package, description: "Material deportivo y equipamiento", accent: acc("inventario") },
  { key: "coordinacion_interna", label: "Coordinación", icon: MessagesSquare, description: "Comunicación interna del staff", accent: acc("coordinacion_interna") },
  { key: "solicitudes", label: "Solicitudes", icon: ClipboardList, description: "Aprobaciones y peticiones", accent: acc("solicitudes") },
  { key: "documentos", label: "Documentos", icon: FileText, description: "Contratos y archivos del club", accent: acc("documentos") },
  { key: "usuarios", label: "Usuarios", icon: UserCog, description: "Miembros, roles y permisos", accent: acc("usuarios") },
  { key: "comunicados", label: "Comunicados", icon: Megaphone, description: "Avisos oficiales del club", accent: acc("comunicados") },
  { key: "multimedia", label: "Multimedia", icon: ImageIcon, description: "Fotos y videos", accent: acc("multimedia") },
  { key: "torneo", label: "Torneo", icon: Trophy, description: "Competencias y clasificaciones", accent: acc("torneo") },
  { key: "tacticas", label: "Tácticas", icon: LayoutGrid, description: "Formaciones y jugadas", accent: acc("tacticas") },
  { key: "salud", label: "Salud", icon: HeartPulse, description: "Parte médico y lesiones", accent: acc("salud") },
  { key: "desarrollo", label: "Desarrollo", icon: TrendingUp, description: "Evaluaciones y progresos", accent: acc("desarrollo") },
  { key: "nutricion", label: "Nutrición", icon: Apple, description: "Planes alimenticios", accent: acc("nutricion") },
  { key: "uniformes", label: "Uniformes", icon: Shirt, description: "Kits y asignaciones", accent: acc("uniformes") },
];

export const MODULE_MAP: Record<ModuleKey, ModuleDef> = Object.fromEntries(
  MODULES.map((m) => [m.key, m]),
) as Record<ModuleKey, ModuleDef>;

export const HOME_MODULE: { key: "home"; label: string; icon: LucideIcon } = {
  key: "home",
  label: "Inicio",
  icon: Home,
};
