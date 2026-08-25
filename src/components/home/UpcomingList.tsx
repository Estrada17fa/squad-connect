import { CalendarDays } from "lucide-react";
import type { CalendarEventRow } from "@/hooks/useCalendarEvents";
import { EventCard } from "@/components/calendar/EventCard";
import { EmptyState } from "@/components/squad/EmptyState";
import { formatRelativeDayLabel } from "@/lib/calendar-utils";
import { HomeSection } from "./HomeSection";

/**
 * Bloque 3 de Inicio: los próximos eventos de la persona con el mismo
 * `EventCard` de la Agenda. Las filas ya llegan filtradas por la RLS de
 * `calendar_events`; si no hay ninguna, se muestra un estado vacío amable.
 */
export function UpcomingList({
  events,
  teamName,
  onOpen,
  onSeeAgenda,
}: {
  events: CalendarEventRow[];
  teamName?: (id: string | null) => string | null;
  onOpen: (event: CalendarEventRow) => void;
  onSeeAgenda?: () => void;
}) {
  return (
    <HomeSection
      icon={CalendarDays}
      title="Mis próximos eventos"
      actionLabel={onSeeAgenda ? "Ver agenda" : undefined}
      onAction={onSeeAgenda}
    >
      {events.length ? (
        <div className="space-y-2">
          {events.map((e, i) => (
            <div key={e.id} className="space-y-1">
              <p className="pl-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                {formatRelativeDayLabel(new Date(e.starts_at))}
              </p>
              <EventCard
                event={e}
                index={i}
                teamLabel={teamName?.(e.team_id) ?? null}
                onClick={() => onOpen(e)}
              />
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="No tienes eventos próximos"
          message="Cuando se agende un entrenamiento, partido, junta o viaje que te toque, aparecerá aquí."
        />
      )}
    </HomeSection>
  );
}
