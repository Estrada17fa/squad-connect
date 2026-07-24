import { Trophy, Dumbbell, Plane, Users, Sparkles, type LucideIcon } from "lucide-react";

export type EventType = "partido" | "entrenamiento" | "viaje" | "junta" | "evento_especial";

export interface EventTypeDef {
  key: EventType;
  label: string;
  icon: LucideIcon;
  /** CSS variable for the accent color (used for dots/pills). */
  cssVar: string;
}

export const EVENT_TYPES: EventTypeDef[] = [
  { key: "partido", label: "Partido", icon: Trophy, cssVar: "var(--event-partido)" },
  { key: "entrenamiento", label: "Entrenamiento", icon: Dumbbell, cssVar: "var(--event-entrenamiento)" },
  { key: "viaje", label: "Viaje", icon: Plane, cssVar: "var(--event-viaje)" },
  { key: "junta", label: "Junta", icon: Users, cssVar: "var(--event-junta)" },
  { key: "evento_especial", label: "Evento especial", icon: Sparkles, cssVar: "var(--event-especial)" },
];

export const EVENT_TYPE_MAP: Record<EventType, EventTypeDef> = Object.fromEntries(
  EVENT_TYPES.map((e) => [e.key, e]),
) as Record<EventType, EventTypeDef>;
