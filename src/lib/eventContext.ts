import type { CalendarEventRow } from "@/hooks/useCalendarEvents";
import { formatShortDate } from "@/lib/calendar-utils";

/**
 * Renglón de contexto de un evento en la Agenda, según su tipo de origen.
 *
 * Solo presentación: usa lo que la RLS ya dejó pasar en la fila. La cita
 * médica nunca muestra motivo, notas ni diagnóstico: como mucho el lugar.
 */
export function buildEventContext(event: CalendarEventRow): string | null {
  const loc = event.location?.trim() || null;

  switch (event.event_type) {
    case "medico":
      return loc;
    case "viaje": {
      const back =
        event.ends_at && event.ends_at.slice(0, 10) !== event.starts_at.slice(0, 10)
          ? `regreso ${formatShortDate(event.ends_at)}`
          : null;
      return [loc, back].filter(Boolean).join(" · ") || null;
    }
    case "partido":
      // El título ya trae "Local vs Visitante"; aquí la sede y la jornada.
      return [loc, event.description?.trim() || null].filter(Boolean).join(" · ") || null;
    case "entrenamiento":
      return event.description?.trim() || loc;
    case "junta":
      return loc || event.description?.trim() || null;
    default:
      return loc;
  }
}
