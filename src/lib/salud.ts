import type { StatusVariant } from "@/components/squad/StatusBadge";
import type { AvailabilityStatus } from "@/hooks/usePlayers";

/**
 * Metadatos del módulo Salud.
 *
 * El "estado de salud" del jugador es el mismo campo que la disponibilidad de
 * Plantel (player_profiles.availability_status): Salud lo gestiona, Plantel lo
 * refleja sin exponer diagnóstico.
 */

export const HEALTH_STATUS_ORDER: AvailabilityStatus[] = [
  "apto",
  "en_duda",
  "en_recuperacion",
  "lesionado",
  "baja_medica",
];

export interface HealthStatusMeta {
  label: string;
  variant: StatusVariant;
  /** Clase de color para semáforos (punto / anillo). */
  dot: string;
  description: string;
}

export const HEALTH_STATUS_META: Record<AvailabilityStatus, HealthStatusMeta> = {
  apto: {
    label: "Apto",
    variant: "approved",
    dot: "bg-status-approved",
    description: "Puede entrenar y competir con normalidad.",
  },
  en_duda: {
    label: "En duda",
    variant: "pending",
    dot: "bg-status-pending",
    description: "Bajo observación médica antes de competir.",
  },
  en_recuperacion: {
    label: "En recuperación",
    variant: "info",
    dot: "bg-status-info",
    description: "Trabajo de readaptación en curso.",
  },
  lesionado: {
    label: "Lesionado",
    variant: "rejected",
    dot: "bg-status-rejected",
    description: "Fuera de actividad por lesión.",
  },
  baja_medica: {
    label: "Baja médica",
    variant: "rejected",
    dot: "bg-status-rejected",
    description: "Baja indicada por el cuerpo médico.",
  },
};

export type CheckupType = "valoracion" | "fisioterapia" | "estudio" | "consulta_externa";

export const CHECKUP_TYPE_ORDER: CheckupType[] = [
  "valoracion",
  "fisioterapia",
  "estudio",
  "consulta_externa",
];

export const CHECKUP_TYPE_LABEL: Record<CheckupType, string> = {
  valoracion: "Valoración",
  fisioterapia: "Fisioterapia",
  estudio: "Estudio",
  consulta_externa: "Consulta externa",
};

export type AppointmentStatus = "programada" | "realizada" | "cancelada";

export const APPOINTMENT_STATUS_LABEL: Record<AppointmentStatus, string> = {
  programada: "Programada",
  realizada: "Realizada",
  cancelada: "Cancelada",
};

export const APPOINTMENT_STATUS_VARIANT: Record<AppointmentStatus, StatusVariant> = {
  programada: "info",
  realizada: "approved",
  cancelada: "neutral",
};

/** Fecha larga consistente en todo el módulo (a partir de una fecha YYYY-MM-DD). */
export function formatDay(date: string | null | undefined): string {
  if (!date) return "—";
  const d = new Date(`${date}T12:00:00`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

/** Color de badge por gravedad de lesión. */
export const SEVERITY_VARIANT: Record<string, StatusVariant> = {
  leve: "info",
  moderada: "pending",
  grave: "rejected",
};

/** Color de badge por estado de lesión. */
export const INJURY_STATUS_BADGE: Record<string, StatusVariant> = {
  activa: "rejected",
  en_recuperacion: "pending",
  recuperada: "approved",
};
