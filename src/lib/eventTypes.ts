import { Trophy, Dumbbell, Plane, Users, Sparkles, Stethoscope, type LucideIcon } from "lucide-react";

export type EventType = "partido" | "entrenamiento" | "viaje" | "junta" | "evento_especial" | "medico";

export interface EventTypeDef {
  key: EventType;
  label: string;
  icon: LucideIcon;
  /** CSS variable for the accent color (used for dots/pills). */
  cssVar: string;
  /** false = el evento lo genera otro módulo, no se crea desde la Agenda. */
  creatable?: boolean;
}

export const EVENT_TYPES: EventTypeDef[] = [
  { key: "partido", label: "Partido", icon: Trophy, cssVar: "var(--event-partido)", creatable: true },
  { key: "entrenamiento", label: "Entrenamiento", icon: Dumbbell, cssVar: "var(--event-entrenamiento)", creatable: true },
  { key: "viaje", label: "Viaje", icon: Plane, cssVar: "var(--event-viaje)", creatable: true },
  { key: "junta", label: "Junta", icon: Users, cssVar: "var(--event-junta)", creatable: true },
  { key: "evento_especial", label: "Evento especial", icon: Sparkles, cssVar: "var(--event-especial)", creatable: true },
  { key: "medico", label: "Cita médica", icon: Stethoscope, cssVar: "var(--event-medico)", creatable: false },
];

/** Tipos que sí se pueden crear como evento suelto desde la Agenda. */
export const CREATABLE_EVENT_TYPES: EventTypeDef[] = EVENT_TYPES.filter((t) => t.creatable);

export const EVENT_TYPE_MAP: Record<EventType, EventTypeDef> = Object.fromEntries(
  EVENT_TYPES.map((e) => [e.key, e]),
) as Record<EventType, EventTypeDef>;
