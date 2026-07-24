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
}

export const MODULES: ModuleDef[] = [
  { key: "calendario", label: "Calendario", icon: Calendar, description: "Partidos, entrenamientos y eventos" },
  { key: "plantel", label: "Plantel", icon: Users, description: "Jugadores y cuerpo técnico" },
  { key: "viajes", label: "Viajes", icon: Plane, description: "Logística de traslados y hospedajes" },
  { key: "inventario", label: "Inventario", icon: Package, description: "Material deportivo y equipamiento" },
  { key: "coordinacion_interna", label: "Coordinación", icon: MessagesSquare, description: "Comunicación interna del staff" },
  { key: "solicitudes", label: "Solicitudes", icon: ClipboardList, description: "Aprobaciones y peticiones" },
  { key: "documentos", label: "Documentos", icon: FileText, description: "Contratos y archivos del club" },
  { key: "usuarios", label: "Usuarios", icon: UserCog, description: "Miembros, roles y permisos" },
  { key: "comunicados", label: "Comunicados", icon: Megaphone, description: "Avisos oficiales del club" },
  { key: "multimedia", label: "Multimedia", icon: ImageIcon, description: "Fotos y videos" },
  { key: "torneo", label: "Torneo", icon: Trophy, description: "Competencias y clasificaciones" },
  { key: "tacticas", label: "Tácticas", icon: LayoutGrid, description: "Formaciones y jugadas" },
  { key: "salud", label: "Salud", icon: HeartPulse, description: "Parte médico y lesiones" },
  { key: "desarrollo", label: "Desarrollo", icon: TrendingUp, description: "Evaluaciones y progresos" },
  { key: "nutricion", label: "Nutrición", icon: Apple, description: "Planes alimenticios" },
  { key: "uniformes", label: "Uniformes", icon: Shirt, description: "Kits y asignaciones" },
];

export const MODULE_MAP: Record<ModuleKey, ModuleDef> = Object.fromEntries(
  MODULES.map((m) => [m.key, m]),
) as Record<ModuleKey, ModuleDef>;

export const HOME_MODULE: { key: "home"; label: string; icon: LucideIcon } = {
  key: "home",
  label: "Inicio",
  icon: Home,
};
