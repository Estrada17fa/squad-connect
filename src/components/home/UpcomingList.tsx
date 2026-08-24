import * as React from "react";
import { CalendarDays } from "lucide-react";
import type { CalendarEventRow } from "@/hooks/useCalendarEvents";
import { EventCard } from "@/components/calendar/EventCard";
import { formatRelativeDayLabel } from "@/lib/calendar-utils";
import { HomeSection } from "./HomeSection";

/**
 * Bloque 2 de Inicio: los siguientes eventos del usuario con el mismo
 * `EventCard` de la Agenda. Si no hay ninguno, el bloque no se muestra.
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
  if (!events.length) return null;

  return (
    <HomeSection
      icon={CalendarDays}
      title="Próximos eventos"
      actionLabel={onSeeAgenda ? "Ver agenda" : undefined}
      onAction={onSeeAgenda}
    >
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
    </HomeSection>
  );
}
