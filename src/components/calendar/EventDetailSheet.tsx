import * as React from "react";
import { CalendarDays, ClipboardList, MapPin, Pencil, Plus, Users } from "lucide-react";
import { DetailField, DetailSection, DetailSheet, DetailValue } from "@/components/squad/DetailSheet";
import { Button } from "@/components/ui/button";
import { TeamBadge } from "@/components/squad/TeamFilter";
import { EVENT_TYPE_MAP } from "@/lib/eventTypes";
import { formatDayLabel, formatTime } from "@/lib/calendar-utils";
import type { CalendarEventRow } from "@/hooks/useCalendarEvents";
import type { TeamOption } from "@/hooks/useAccess";
import { useSessionByEvent } from "@/hooks/useTraining";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { SessionPlanContent } from "@/components/entrenamientos/SessionPlanContent";
import { SessionFormDialog } from "@/components/entrenamientos/SessionFormDialog";
import { AttendeeSummary } from "./AttendeeSummary";
import { LocationDisplay } from "./LocationDisplay";
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
  const isTraining = event?.event_type === "entrenamiento";
  const sessionQ = useSessionByEvent(open && isTraining ? event!.id : null);
  const session = sessionQ.data ?? null;
  const { canEditTeam } = useTeamAccess("entrenamientos");
  const canEditPlan = !!event && canEditTeam(event.team_id);
  const [planForm, setPlanForm] = React.useState<null | "new" | "edit">(null);

  React.useEffect(() => {
    if (!open) setPlanForm(null);
  }, [open]);

  if (!event) return null;
  const def = EVENT_TYPE_MAP[event.event_type];

  return (
    <>
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
          {event.location || (event as any).location_id ? (
            <DetailField label="Ubicación" icon={MapPin}>
              <LocationDisplay
                clubId={clubId}
                locationId={(event as any).location_id ?? null}
                text={event.location}
              />
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

        {isTraining ? (
          session ? (
            <DetailSection
              title={
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 normal-case tracking-normal text-foreground">
                    <ClipboardList className="h-4 w-4 text-primary" /> Plan de entrenamiento
                  </span>
                  {canEditPlan ? (
                    <Button type="button" size="sm" variant="secondary" onClick={() => setPlanForm("edit")}>
                      <Pencil className="mr-2 h-3.5 w-3.5" /> Editar plan
                    </Button>
                  ) : null}
                </span>
              }
            >
              <SessionPlanContent session={session} enabled={open} readOnly={!canEditPlan} />
            </DetailSection>
          ) : sessionQ.isLoading ? null : canEditPlan && clubId ? (
            <Button type="button" variant="outline" className="w-full" onClick={() => setPlanForm("new")}>
              <Plus className="mr-2 h-4 w-4" /> Agregar plan de entrenamiento
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">Sin plan de entrenamiento aún.</p>
          )
        ) : null}
      </DetailSheet>

      {planForm && clubId ? (
        <SessionFormDialog
          open
          onOpenChange={(v) => {
            if (!v) setPlanForm(null);
          }}
          clubId={clubId}
          userId={userId}
          teams={teams}
          defaultTeamId={event.team_id}
          defaultEventId={event.id}
          session={planForm === "edit" ? session : null}
        />
      ) : null}
    </>
  );
}
