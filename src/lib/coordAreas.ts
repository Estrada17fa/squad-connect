import {
  Users, Stethoscope, ClipboardList, ListChecks, Megaphone, Image, Inbox, Plane,
  CalendarDays, Shirt, Trophy, Dumbbell, LineChart, Medal, Package, Apple, HeartPulse,
  type LucideIcon,
} from "lucide-react";

export type AreaKey = "general" | "tecnica" | "medica";

export interface CoordModule {
  key: string;
  name: string;
  icon: LucideIcon;
  /** Módulo actual en /m/<legacy> (solo referencia). */
  legacy?: string;
  comingSoon?: boolean;
}

export interface CoordArea {
  key: AreaKey;
  name: string;
  icon: LucideIcon;
  /** Clases de color del área (tokens del tema). */
  text: string;
  bgSoft: string;
  bg: string;
  modules: CoordModule[];
}

export const COORD_AREAS: CoordArea[] = [
  {
    key: "general", name: "General", icon: Users,
    text: "text-area-general", bgSoft: "bg-area-general-soft", bg: "bg-area-general",
    modules: [
      { key: "tareas", name: "Tareas y juntas", icon: ListChecks, legacy: "coordinacion_interna" },
      { key: "comunicados", name: "Comunicados", icon: Megaphone, legacy: "comunicados" },
      { key: "multimedia", name: "Multimedia", icon: Image, legacy: "multimedia" },
      { key: "solicitudes", name: "Solicitudes", icon: Inbox, legacy: "solicitudes" },
      { key: "viajes", name: "Viajes", icon: Plane, legacy: "viajes" },
      { key: "eventos", name: "Eventos", icon: CalendarDays, comingSoon: true },
    ],
  },
  {
    key: "tecnica", name: "Técnica", icon: ClipboardList,
    text: "text-area-tecnica", bgSoft: "bg-area-tecnica-soft", bg: "bg-area-tecnica",
    modules: [
      { key: "plantel", name: "Plantel", icon: Shirt, legacy: "plantel" },
      { key: "partidos", name: "Partidos", icon: Trophy, legacy: "partidos" },
      { key: "entrenamientos", name: "Entrenamientos", icon: Dumbbell, legacy: "entrenamientos" },
      { key: "evaluaciones", name: "Evaluaciones", icon: LineChart, legacy: "desarrollo" },
      { key: "torneo", name: "Torneo", icon: Medal, legacy: "torneo" },
      { key: "utileria", name: "Utilería", icon: Package, legacy: "inventario" },
    ],
  },
  {
    key: "medica", name: "Médica", icon: Stethoscope,
    text: "text-area-medica", bgSoft: "bg-area-medica-soft", bg: "bg-area-medica",
    modules: [
      { key: "salud", name: "Salud", icon: HeartPulse, legacy: "salud" },
      { key: "nutricion", name: "Nutrición", icon: Apple, legacy: "nutricion" },
    ],
  },
];

export function getArea(key: string | undefined): CoordArea | undefined {
  return COORD_AREAS.find((a) => a.key === key);
}

export const LAST_AREA_KEY = "squad.coord.lastArea";
