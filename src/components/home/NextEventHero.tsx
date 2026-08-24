import * as React from "react";
import { CalendarDays, Clock, MapPin } from "lucide-react";
import { EVENT_TYPE_MAP } from "@/lib/eventTypes";
import type { CalendarEventRow } from "@/hooks/useCalendarEvents";
import { formatRelativeDayLabel, formatTime } from "@/lib/calendar-utils";
import { buildEventContext } from "@/lib/eventContext";
import { AccentBar } from "@/components/squad/StandardCard";
import { EmptyState } from "@/components/squad/EmptyState";

/**
 * Bloque 1 de Inicio: el evento más cercano del usuario, en grande.
 *
 * Solo presentación: la fila ya viene filtrada por la RLS de
 * `calendar_events` (cada evento según el permiso de su módulo de origen).
 */
export function NextEventHero({
  event,
  teamLabel,
  onOpen,
}: {
  event: CalendarEventRow | null;
  teamLabel?: string | null;
  onOpen: (event: CalendarEventRow) => void;
}) {
  if (!event) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="No tienes eventos próximos"
        message="Cuando se agende un entrenamiento, partido, junta, viaje o cita, aparecerá aquí."
      />
    );
  }

  const def = EVENT_TYPE_MAP[event.event_type];
  const Icon = def.icon;
  const context = buildEventContext(event);

  return (
    <button
      type="button"
      onClick={() => onOpen(event)}
      className="glass animate-card-in relative w-full overflow-hidden p-0 text-left transition-all hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.99]"
    >
      <AccentBar color={def.cssVar} label={def.label} />
      <div className="space-y-3 py-5 pl-5 pr-4">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${def.cssVar}1f`, color: def.cssVar }}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span
            className="text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: def.cssVar }}
          >
            {def.label}
          </span>
          <span className="ml-auto text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {formatRelativeDayLabel(new Date(event.starts_at))}
          </span>
        </div>

        <h2 className="font-display text-xl font-bold leading-tight text-foreground">
          {event.title}
        </h2>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {formatTime(event.starts_at)}
            {event.ends_at ? ` – ${formatTime(event.ends_at)}` : ""}
          </span>
          {context ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{context}</span>
            </span>
          ) : null}
        </div>

        {teamLabel ? (
          <span className="inline-flex rounded-full border border-border/60 px-2 py-0.5 text-[11px] text-muted-foreground">
            {teamLabel}
          </span>
        ) : null}
      </div>
    </button>
  );
}
