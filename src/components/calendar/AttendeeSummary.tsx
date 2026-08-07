import * as React from "react";
import { Users } from "lucide-react";
import { useEventAttendees } from "@/hooks/useCalendarEvents";
import { useTeamMembers } from "@/hooks/useTeamMembers";

interface Props {
  eventId: string | null | undefined;
  clubId: string | null | undefined;
  teamId: string | null | undefined;
}

/**
 * Resumen de convocatoria: "Todo el equipo (N)" cuando coincide con la plantilla
 * completa, o "N convocados de M" con la lista cuando fue personalizada.
 */
export function AttendeeSummary({ eventId, clubId, teamId }: Props) {
  const attendeesQ = useEventAttendees(eventId);
  const membersQ = useTeamMembers(teamId ?? null, clubId ?? null);

  const attendees = attendeesQ.data ?? [];
  const members = membersQ.data ?? [];

  if (!eventId) return null;
  if (attendeesQ.isLoading) return <p className="text-sm text-muted-foreground">Cargando convocatoria…</p>;
  if (!attendees.length) return <p className="text-sm text-muted-foreground">Sin convocados.</p>;

  const attendeeIds = new Set(attendees.map((a: any) => a.user_id as string));
  const isWholeTeam =
    members.length > 0 && attendeeIds.size === members.length && members.every((m) => attendeeIds.has(m.id));

  const names = attendees
    .map((a: any) => a.profile?.full_name ?? a.profile?.email ?? "—")
    .sort((x: string, y: string) => x.localeCompare(y));

  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
        <Users className="h-4 w-4 text-primary" />
        {isWholeTeam
          ? `Todo el equipo (${attendees.length})`
          : `${attendees.length} convocados${members.length ? ` de ${members.length}` : ""}`}
      </p>
      {!isWholeTeam ? (
        <div className="flex flex-wrap gap-1.5">
          {names.map((n: string, i: number) => (
            <span
              key={`${n}-${i}`}
              className="rounded-full border border-border/60 px-2 py-0.5 text-xs text-muted-foreground"
            >
              {n}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
