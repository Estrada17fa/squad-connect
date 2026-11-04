// Datos de ejemplo de la portada de Administración (solo diseño).
import { Users, Trophy, Building, UserX, Tag, IdCard, type LucideIcon } from "lucide-react";
import type { MockPending } from "@/lib/coordMockData";

export const ADMIN_SEASON = "Liga Premier · 2026-2027";

export const ADMIN_STATS = [
  { value: "60", label: "miembros" },
  { value: "2", label: "categorías" },
  { value: "1", label: "torneo en curso" },
];

export const ADMIN_PENDING: MockPending[] = [
  { icon: UserX, text: "Sin entrar a la app", context: "Nunca han iniciado sesión", value: "3", urgency: "amber" },
  { icon: Tag, text: "Sin categoría", context: "Miembros sin rol asignado", value: "1", urgency: "red" },
  { icon: IdCard, text: "Jugadores sin ficha deportiva", context: "Completar en Plantel", value: "5", urgency: "gray" },
];

export type AdminModuleKey = "usuarios" | "torneos" | "club";

export interface AdminModule {
  key: AdminModuleKey;
  name: string;
  line: string;
  stat: string;
  icon: LucideIcon;
  /** Pantalla actual para "Ver versión actual". */
  legacy: string;
}

export const ADMIN_MODULES: AdminModule[] = [
  { key: "usuarios", name: "Usuarios", line: "Miembros, roles y permisos", stat: "60 activos", icon: Users, legacy: "/m/usuarios" },
  { key: "torneos", name: "Torneos", line: "Alta de competencias", stat: "1 en curso", icon: Trophy, legacy: "/admin/torneo" },
  { key: "club", name: "Club", line: "Identidad, categorías y ubicaciones", stat: "2 categorías", icon: Building, legacy: "/admin/configuracion" },
];
