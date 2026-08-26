import * as React from "react";
import { MapPin } from "lucide-react";
import { EVENT_TYPE_MAP } from "@/lib/eventTypes";
import { formatDayChip, formatTime, isSameClubDay } from "@/lib/calendar-utils";
import type { CalendarEventRow } from "@/hooks/useCalendarEvents";
import { cn } from "@/lib/utils";
import { AccentBar } from "@/components/squad/StandardCard";
import { buildEventContext } from "@/lib/eventContext";

/**
 * Tarjeta visual de un evento de la Agenda.
 * Barra lateral y icono con el color del tipo, hora destacada a la izquierda,
 * título y un renglón de contexto (sede, equipo, etc.). Solo presentación.
 */
export function EventCard({
  event,
  context,
  teamLabel,
  onClick,
  index = 0,
  className,
}: {
  event: CalendarEventRow;
  /** Renglón de contexto adicional (rival, destino…). */
  context?: React.ReactNode;
  teamLabel?: string | null;
  onClick?: () => void;
  index?: number;
  className?: string;
}) {
  const def = EVENT_TYPE_MAP[event.event_type];
  const Icon = def.icon;
  const color = def.cssVar;
  // Contexto por tipo (sede, destino, objetivo…) cuando no se pasa uno explícito.
  const line = context ?? buildEventContext(event);
  // El viaje solo captura fechas: mostrar hora sería un placeholder falso.
  const isTrip = event.event_type === "viaje" || !!event.trip_id;
  const tripReturn =
    isTrip && event.ends_at && !isSameClubDay(event.starts_at, event.ends_at) ? event.ends_at : null;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{ animationDelay: `${index * 30}ms` }}
      className={cn(
        "animate-card-in glass relative w-full overflow-hidden p-0 text-left transition-all",
        "hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.99]",
        className,
      )}
    >
      <AccentBar color={color} label={def.label} />
      <div className="flex items-stretch gap-3 py-3 pl-4 pr-3">
        <div className="flex shrink-0 flex-col items-start justify-center">
          <span className="whitespace-nowrap font-display text-sm font-bold leading-none text-foreground">
            {isTrip ? formatDayChip(event.starts_at) : formatTime(event.starts_at)}
          </span>
          {isTrip ? (
            tripReturn ? (
              <span className="mt-1 whitespace-nowrap text-[11px] leading-none text-muted-foreground">
                → {formatDayChip(tripReturn)}
              </span>
            ) : null
          ) : event.ends_at ? (
            <span className="mt-1 whitespace-nowrap text-[11px] leading-none text-muted-foreground">
              {formatTime(event.ends_at)}
            </span>
          ) : null}
        </div>


        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-xl"
          style={{ backgroundColor: `color-mix(in oklab, ${color} 18%, transparent)` }}
        >
          <Icon className="h-4.5 w-4.5" style={{ color }} />
        </div>

        <div className="min-w-0 flex-1 self-center">
          <p className="truncate font-display font-semibold text-foreground">{event.title}</p>
          <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{ backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)`, color }}
            >
              {def.label}
            </span>
            {line ? (
              <span className="inline-flex min-w-0 items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                <span className="truncate">{line}</span>
              </span>
            ) : null}
            {teamLabel ? <span className="truncate opacity-80">{teamLabel}</span> : null}
          </div>
        </div>
      </div>
    </button>
  );
}
