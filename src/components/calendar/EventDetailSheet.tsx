import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  ClipboardList,
  Lock,
  MapPin,
  Pencil,
  Plane,
  Plus,
  Trophy,
  Users,
} from "lucide-react";
import { DetailField, DetailSection, DetailSheet, DetailValue } from "@/components/squad/DetailSheet";
import { Button } from "@/components/ui/button";
import { TeamBadge } from "@/components/squad/TeamFilter";
import { EVENT_TYPE_MAP } from "@/lib/eventTypes";
import { formatDayLabel, formatTime } from "@/lib/calendar-utils";
import type { CalendarEventRow } from "@/hooks/useCalendarEvents";
import type { TeamOption } from "@/hooks/useAccess";
import { useSessionByEvent } from "@/hooks/useTraining";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { useMatchByEvent, useMatchCallups, useMatchLogistics } from "@/hooks/useMatchOps";
import { MATCH_STATUS_LABEL } from "@/lib/torneo";
import { TeamCrest } from "@/components/torneo/TeamCrest";
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

/**
 * Ficha de un evento de la Agenda. El contenido se enruta según el módulo
 * de origen: entrenamiento -> plan de sesión, partido -> convocatoria y
 * logística, viaje -> enlace a Viajes, cita médica -> solo lo genérico
 * (nunca motivo ni diagnóstico).
 */
export function EventDetailSheet({ open, onOpenChange, event, canEdit, clubId, userId, teams, teamName }: Props) {
  const type = event?.event_type;
  const isTraining = type === "entrenamiento";
  const isMedical = type === "medico";
  const isMatch = type === "partido";
  const isTrip = type === "viaje" || !!event?.trip_id;

  const sessionQ = useSessionByEvent(open && isTraining ? event!.id : null);
  const session = sessionQ.data ?? null;
  const matchQ = useMatchByEvent(open && isMatch ? event!.id : null);
  const match = matchQ.data ?? null;
  const callups = useMatchCallups(match ? [match.id] : []).data ?? [];
  const logistics = useMatchLogistics(match ? [match.id] : []).data ?? [];
  const matchLogistics = logistics[0] ?? null;

  const { canEditTeam } = useTeamAccess("entrenamientos");
  const canEditPlan = !!event && canEditTeam(event.team_id);
  const [planForm, setPlanForm] = React.useState<null | "new" | "edit">(null);

  React.useEffect(() => {
    if (!open) setPlanForm(null);
  }, [open]);

  if (!event) return null;
  const def = EVENT_TYPE_MAP[event.event_type];
  // Las citas médicas nunca son editables desde la Agenda.
  const editable = canEdit && !isMedical && !isMatch && !isTrip && !event.meeting_id;

  return (
    <>
      <DetailSheet
        open={open}
        onOpenChange={onOpenChange}
        title={event.title}
        icon={def.icon}
        accent={def.cssVar}
        description={`${formatDayLabel(new Date(event.starts_at))} · ${formatTime(event.starts_at)}`}
        canEdit={editable && !!clubId}
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
          {event.location || event.location_id ? (
            <DetailField label="Ubicación" icon={MapPin}>
              <LocationDisplay clubId={clubId} locationId={event.location_id ?? null} text={event.location} />
            </DetailField>
          ) : null}
          <DetailField label="Equipo" icon={Users}>
            <TeamBadge name={teamName?.(event.team_id) ?? undefined} />
          </DetailField>
          {event.description && !isMedical ? (
            <DetailField label="Notas">
              <DetailValue value={event.description} />
            </DetailField>
          ) : null}
        </DetailSection>

        {/* Cita médica: solo lo genérico. El detalle clínico vive en Salud. */}
        {isMedical ? (
          <p className="flex items-start gap-2 rounded-xl border border-border/60 bg-white/[0.03] p-3 text-xs text-muted-foreground">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Cita privada. El motivo, el diagnóstico y las notas clínicas solo se consultan en el módulo Salud.
          </p>
        ) : null}

        {/* Partido: rival, resultado, convocatoria y logística según permiso. */}
        {isMatch && match ? (
          <>
            <DetailSection title="Partido">
              <DetailField label="Rival" icon={Trophy}>
                <span className="inline-flex items-center gap-2">
                  <TeamCrest path={match.rival?.crest_path} name={match.rival?.name ?? "Rival"} className="h-6 w-6" />
                  {match.rival?.name ?? "Por definir"}
                  <span className="text-muted-foreground">· {match.isHome ? "Local" : "Visitante"}</span>
                </span>
              </DetailField>
              <DetailField label="Torneo">
                {match.tournament_name}
                {match.matchday ? ` · Jornada ${match.matchday}` : ""}
              </DetailField>
              <DetailField label="Estado">
                {MATCH_STATUS_LABEL[match.status]}
                {match.status === "jugado" && match.home_goals != null && match.away_goals != null
                  ? ` · ${match.home_goals} - ${match.away_goals}`
                  : ""}
              </DetailField>
              {match.venue ? <DetailField label="Sede">{match.venue}</DetailField> : null}
            </DetailSection>

            {matchLogistics ? (
              <DetailSection title="Logística">
                {matchLogistics.call_time_at ? (
                  <DetailField label="Citación">{formatTime(matchLogistics.call_time_at)}</DetailField>
                ) : null}
                {matchLogistics.meeting_point ? (
                  <DetailField label="Punto de reunión">{matchLogistics.meeting_point}</DetailField>
                ) : null}
                {matchLogistics.kit ? <DetailField label="Uniforme">{matchLogistics.kit}</DetailField> : null}
                {matchLogistics.logistics_notes ? (
                  <DetailField label="Notas">
                    <DetailValue value={matchLogistics.logistics_notes} />
                  </DetailField>
                ) : null}
              </DetailSection>
            ) : null}

            <DetailSection title={`Convocatoria (${callups.length})`}>
              {callups.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sin convocatoria publicada.</p>
              ) : (
                <ul className="space-y-1 text-sm text-foreground">
                  {callups.map((c) => (
                    <li key={c.id}>{c.profile?.full_name ?? "Convocado"}</li>
                  ))}
                </ul>
              )}
            </DetailSection>
          </>
        ) : null}

        {/* Viaje: la información completa vive en la pestaña Viajes. */}
        {isTrip ? (
          <Button asChild variant="outline" className="w-full">
            <Link to="/agenda-viajes">
              <Plane className="mr-2 h-4 w-4" /> Ver el viaje
            </Link>
          </Button>
        ) : null}

        {/* Convocatoria de juntas y eventos sueltos. */}
        {!isMedical && !isMatch && !isTrip ? (
          <DetailSection title="Convocatoria">
            <AttendeeSummary eventId={event.id} clubId={clubId} teamId={event.team_id} />
          </DetailSection>
        ) : null}

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
