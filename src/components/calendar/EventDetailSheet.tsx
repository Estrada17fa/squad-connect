import * as React from "react";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { DetailField, DetailSection, DetailSheet, DetailValue } from "@/components/squad/DetailSheet";
import { TeamBadge } from "@/components/squad/TeamFilter";
import { EVENT_TYPE_MAP } from "@/lib/eventTypes";
import { formatDayLabel, formatTime } from "@/lib/calendar-utils";
import type { CalendarEventRow } from "@/hooks/useCalendarEvents";
import type { TeamOption } from "@/hooks/useAccess";
import { AttendeeSummary } from "./AttendeeSummary";
import { EventFormDialog } from "./EventFormDialog";


interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  event: CalendarEventRow | null;
  canEdit: boolean;
  clubId: string | null;
  userId: string;
  teams: TeamOption[];
  teamName?: (id: string | null) => string | null;
}

/** Ficha de lectura de un evento del calendario, con edición opcional. */
export function EventDetailSheet({ open, onOpenChange, event, canEdit, clubId, userId, teams, teamName }: Props) {
  if (!event) return null;
  const def = EVENT_TYPE_MAP[event.event_type];

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={event.title}
      description={def.label}
      canEdit={canEdit && !!clubId}
      renderEdit={
        clubId
          ? ({ done }) => (
              <EventFormDialog
                open
                onOpenChange={(v) => {
                  if (!v) done();
                }}
                clubId={clubId}
                teams={teams}
                userId={userId}
                event={event}
              />
            )
          : undefined
      }
    >
      <DetailSection title="Detalle">
        <DetailField label="Fecha y hora" icon={CalendarDays}>
          {formatDayLabel(new Date(event.starts_at))} · {formatTime(event.starts_at)}
          {event.ends_at ? ` – ${formatTime(event.ends_at)}` : ""}
        </DetailField>
        {event.location ? (
          <DetailField label="Ubicación" icon={MapPin}>
            <DetailValue value={event.location} />
          </DetailField>
        ) : null}
        <DetailField label="Equipo" icon={Users}>
          <TeamBadge name={teamName?.(event.team_id) ?? undefined} />
        </DetailField>
        {event.description ? (
          <DetailField label="Notas">
            <DetailValue value={event.description} />
          </DetailField>
        ) : null}
      </DetailSection>

      <DetailSection title="Convocatoria">
        <AttendeeSummary eventId={event.id} clubId={clubId} teamId={event.team_id} />
      </DetailSection>

    </DetailSheet>
  );
}
