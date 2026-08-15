import { EVENT_TYPE_MAP, type EventType } from "@/lib/eventTypes";
import type { TaskPriority } from "@/hooks/useCoordinacion";
import type { AnnouncementPriority } from "@/hooks/useAnnouncements";
import type { RequestStatus } from "@/lib/requestTypes";
import type { FiscalStatus } from "@/lib/expenses";
import type { AvailabilityStatus } from "@/hooks/usePlayers";

/**
 * Colores de la barra lateral de las tarjetas.
 * Significado consistente en toda la app:
 * verde = ok/bajo · ámbar = medio/pendiente · rojo = alto/alerta ·
 * azul = informativo · gris = neutro/sin dato.
 */
export const ACCENT = {
  low: "var(--level-low)",
  mid: "var(--level-mid)",
  high: "var(--level-high)",
  critical: "var(--level-critical)",
  info: "var(--level-info)",
  neutral: "var(--level-neutral)",
  brand: "var(--primary)",
} as const;

export type AccentColor = string;

/* --------------------------------- Agenda --------------------------------- */

export function eventAccent(type: EventType): AccentColor {
  return EVENT_TYPE_MAP[type].cssVar;
}

/* --------------------------------- Tareas --------------------------------- */

export const TASK_PRIORITY_ACCENT: Record<TaskPriority, AccentColor> = {
  baja: ACCENT.low,
  media: ACCENT.mid,
  alta: ACCENT.high,
  urgente: ACCENT.critical,
};

/* ------------------------------- Comunicados ------------------------------ */

export const ANNOUNCEMENT_ACCENT: Record<AnnouncementPriority, AccentColor> = {
  normal: ACCENT.neutral,
  importante: ACCENT.mid,
  urgente: ACCENT.high,
};

/* ------------------------------- Solicitudes ------------------------------ */

export const REQUEST_ACCENT: Record<RequestStatus, AccentColor> = {
  pendiente: ACCENT.mid,
  requiere_info: ACCENT.info,
  aprobada: ACCENT.low,
  completada: ACCENT.low,
  rechazada: ACCENT.high,
  cancelada: ACCENT.neutral,
};

/* --------------------------------- Compras -------------------------------- */

export const FISCAL_ACCENT: Record<FiscalStatus, AccentColor> = {
  sin_factura: ACCENT.high,
  factura_pendiente: ACCENT.mid,
  facturado: ACCENT.low,
};

/* ------------------------------- Inventario ------------------------------- */

/** Disponible (verde) · stock bajo (ámbar) · agotado (rojo). */
export function stockAccent(available: number, min = 0): AccentColor {
  if (available <= 0) return ACCENT.high;
  if (available <= min) return ACCENT.mid;
  return ACCENT.low;
}

export function loanAccent(opts: { returned: boolean; overdue: boolean; partial: boolean }): AccentColor {
  if (opts.returned) return ACCENT.low;
  if (opts.overdue) return ACCENT.high;
  if (opts.partial) return ACCENT.mid;
  return ACCENT.info;
}

/* -------------------------------- Partidos -------------------------------- */

export function matchAccent(status: string): AccentColor {
  if (status === "jugado") return ACCENT.low;
  if (status === "suspendido" || status === "cancelado") return ACCENT.high;
  return ACCENT.info;
}

/* --------------------------------- Plantel -------------------------------- */

export const AVAILABILITY_ACCENT: Record<AvailabilityStatus, AccentColor> = {
  apto: ACCENT.low,
  en_duda: ACCENT.mid,
  en_recuperacion: ACCENT.info,
  lesionado: ACCENT.high,
  baja_medica: ACCENT.critical,
};
