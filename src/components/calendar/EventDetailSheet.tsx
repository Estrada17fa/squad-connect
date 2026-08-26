import * as React from "react";
import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  ClipboardList,
  Clock,
  Info,
  Lock,
  MapPin,
  Pencil,
  Plane,
  Plus,
  Shirt,
  Trophy,
  Users,
} from "lucide-react";
import {
  DetailAvatars,
  DetailBadge,
  DetailEmptyBlock,
  DetailField,
  DetailGrid,
  DetailPeopleList,
  DetailSection,
  DetailSheet,
  DetailValue,
} from "@/components/squad/DetailSheet";
import { Button } from "@/components/ui/button";
import { TeamBadge } from "@/components/squad/TeamFilter";
import { EVENT_TYPE_MAP } from "@/lib/eventTypes";
import { formatDayLabel, formatTime, formatTripRange } from "@/lib/calendar-utils";
import type { CalendarEventRow } from "@/hooks/useCalendarEvents";
import type { TeamOption } from "@/hooks/useAccess";
import { useSessionByEvent } from "@/hooks/useTraining";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { useMatchByEvent, useMatchCallups, useMatchLogistics } from "@/hooks/useMatchOps";
import { MATCH_STATUS_LABEL } from "@/lib/torneo";
import { matchAccent } from "@/lib/accents";
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
  const team = teamName?.(event.team_id) ?? undefined;
  const callupPeople = callups.map((c) => ({
    id: c.id,
    name: c.profile?.full_name ?? "Convocado",
    avatarUrl: (c.profile as any)?.avatar_url ?? null,
  }));

  return (
    <>
      <DetailSheet
        open={open}
        onOpenChange={onOpenChange}
        title={event.title}
        icon={def.icon}
        accent={def.cssVar}
        description={
          isTrip
            ? formatTripRange(event.starts_at, event.ends_at)
            : `${formatDayLabel(new Date(event.starts_at))} · ${formatTime(event.starts_at)}`
        }
        canEdit={editable && !!clubId}
        badges={
          <>
            <DetailBadge color={def.cssVar} icon={def.icon}>
              {def.label}
            </DetailBadge>
            {team ? <DetailBadge>{team}</DetailBadge> : null}
            {isMatch && match ? (
              <DetailBadge color={matchAccent(match.status)}>{MATCH_STATUS_LABEL[match.status]}</DetailBadge>
            ) : null}
          </>
        }
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
        <DetailSection title="Detalle" icon={Info}>
          <DetailGrid>
            <DetailField label={isTrip ? "Fecha" : "Fecha y hora"} icon={CalendarDays}>
              {isTrip ? (
                formatTripRange(event.starts_at, event.ends_at)
              ) : (
                <>
                  {formatDayLabel(new Date(event.starts_at))} · {formatTime(event.starts_at)}
                  {event.ends_at ? ` – ${formatTime(event.ends_at)}` : ""}
                </>
              )}
            </DetailField>
            <DetailField label="Equipo" icon={Users}>
              <TeamBadge name={team} />
            </DetailField>
            {event.location || event.location_id ? (
              <DetailField label="Ubicación" icon={MapPin} full>
                <LocationDisplay clubId={clubId} locationId={event.location_id ?? null} text={event.location} />
              </DetailField>
            ) : null}
            {event.description && !isMedical ? (
              <DetailField label="Notas" full>
                <DetailValue value={event.description} />
              </DetailField>
            ) : null}
          </DetailGrid>
        </DetailSection>

        {/* Cita médica: solo lo genérico. El detalle clínico vive en Salud. */}
        {isMedical ? (
          <DetailSection title="Privacidad" icon={Lock}>
            <DetailEmptyBlock icon={Lock}>
              Cita privada. El motivo, el diagnóstico y las notas clínicas solo se consultan en el módulo Salud.
            </DetailEmptyBlock>
          </DetailSection>
        ) : null}

        {/* Partido: rival, resultado, convocatoria y logística según permiso. */}
        {isMatch && match ? (
          <>
            <DetailSection title="Partido" icon={Trophy}>
              <div className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] p-3">
                <TeamCrest
                  path={match.rival?.crest_path}
                  name={match.rival?.name ?? "Rival"}
                  className="h-12 w-12"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base font-semibold text-foreground">
                    {match.rival?.name ?? "Por definir"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {match.isHome ? "Jugamos de local" : "Jugamos de visitante"}
                  </p>
                </div>
                {match.status === "jugado" && match.home_goals != null && match.away_goals != null ? (
                  <p className="shrink-0 font-display text-xl font-semibold tabular-nums text-foreground">
                    {match.home_goals} - {match.away_goals}
                  </p>
                ) : null}
              </div>
              <DetailGrid>
                <DetailField label="Torneo" icon={Trophy}>
                  {match.tournament_name}
                  {match.matchday ? ` · Jornada ${match.matchday}` : ""}
                </DetailField>
                <DetailField label="Estado">{MATCH_STATUS_LABEL[match.status]}</DetailField>
                {match.venue ? (
                  <DetailField label="Sede" icon={MapPin} full>
                    {match.venue}
                  </DetailField>
                ) : null}
              </DetailGrid>
            </DetailSection>

            {matchLogistics ? (
              <DetailSection title="Logística" icon={ClipboardList}>
                <DetailGrid>
                  {matchLogistics.call_time_at ? (
                    <DetailField label="Citación" icon={Clock}>
                      {formatTime(matchLogistics.call_time_at)}
                    </DetailField>
                  ) : null}
                  {matchLogistics.kit ? (
                    <DetailField label="Uniforme" icon={Shirt}>
                      {matchLogistics.kit}
                    </DetailField>
                  ) : null}
                  {matchLogistics.meeting_point ? (
                    <DetailField label="Punto de reunión" icon={MapPin} full>
                      {matchLogistics.meeting_point}
                    </DetailField>
                  ) : null}
                  {matchLogistics.logistics_notes ? (
                    <DetailField label="Notas" full>
                      <DetailValue value={matchLogistics.logistics_notes} />
                    </DetailField>
                  ) : null}
                </DetailGrid>
              </DetailSection>
            ) : null}

            <DetailSection title={`Convocatoria (${callups.length})`} icon={Users}>
              {callups.length === 0 ? (
                <DetailEmptyBlock icon={Users}>Sin convocatoria publicada.</DetailEmptyBlock>
              ) : (
                <div className="space-y-3">
                  <DetailAvatars people={callupPeople} />
                  <DetailPeopleList people={callupPeople} />
                </div>
              )}
            </DetailSection>
          </>
        ) : null}

        {/* Viaje: la información completa vive en la pestaña Viajes. */}
        {isTrip ? (
          <DetailSection title="Viaje" icon={Plane}>
            <Button asChild variant="outline" className="w-full">
              <Link to="/agenda-viajes">
                <Plane className="mr-2 h-4 w-4" /> Ver el viaje
              </Link>
            </Button>
          </DetailSection>
        ) : null}

        {/* Convocatoria de juntas y eventos sueltos. */}
        {!isMedical && !isMatch && !isTrip ? (
          <DetailSection title="Convocatoria" icon={Users}>
            <AttendeeSummary eventId={event.id} clubId={clubId} teamId={event.team_id} />
          </DetailSection>
        ) : null}

        {isTraining ? (
          session ? (
            <DetailSection
              title="Plan de entrenamiento"
              icon={ClipboardList}
              action={
                canEditPlan ? (
                  <Button type="button" size="sm" variant="secondary" onClick={() => setPlanForm("edit")}>
                    <Pencil className="mr-2 h-3.5 w-3.5" /> Editar plan
                  </Button>
                ) : null
              }
            >
              <SessionPlanContent session={session} enabled={open} readOnly={!canEditPlan} />
            </DetailSection>
          ) : sessionQ.isLoading ? null : (
            <DetailSection title="Plan de entrenamiento" icon={ClipboardList}>
              {canEditPlan && clubId ? (
                <Button type="button" variant="outline" className="w-full" onClick={() => setPlanForm("new")}>
                  <Plus className="mr-2 h-4 w-4" /> Agregar plan de entrenamiento
                </Button>
              ) : (
                <DetailEmptyBlock icon={ClipboardList}>Sin plan de entrenamiento aún.</DetailEmptyBlock>
              )}
            </DetailSection>
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
