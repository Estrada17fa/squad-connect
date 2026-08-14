import { Dumbbell, Swords, Sparkles, Users, Building2, Image as ImageIcon, type LucideIcon } from "lucide-react";

/** Tipos de publicación multimedia (enum `media_post_type` en la base). */
export type MediaPostType =
  | "entrenamiento"
  | "partido"
  | "evento_especial"
  | "convivencia"
  | "institucional"
  | "otro";

export const MEDIA_TYPES: MediaPostType[] = [
  "entrenamiento",
  "partido",
  "evento_especial",
  "convivencia",
  "institucional",
  "otro",
];

export const MEDIA_TYPE_LABEL: Record<MediaPostType, string> = {
  entrenamiento: "Entrenamiento",
  partido: "Partido",
  evento_especial: "Evento especial",
  convivencia: "Convivencia",
  institucional: "Institucional",
  otro: "Otro",
};

export const MEDIA_TYPE_ICON: Record<MediaPostType, LucideIcon> = {
  entrenamiento: Dumbbell,
  partido: Swords,
  evento_especial: Sparkles,
  convivencia: Users,
  institucional: Building2,
  otro: ImageIcon,
};

export type MediaAudience = "club" | "teams";
export type MediaFileKind = "image" | "video";

export function mediaKindFromFile(file: File): MediaFileKind {
  return file.type.startsWith("video/") ? "video" : "image";
}
