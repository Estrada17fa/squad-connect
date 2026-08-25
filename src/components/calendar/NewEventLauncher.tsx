import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Plus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { EVENT_TYPE_MAP, type EventType } from "@/lib/eventTypes";
import { useEditableTeams } from "@/hooks/useEditableTeams";
import type { TeamOption } from "@/hooks/useAccess";
import { EventFormDialog } from "@/components/calendar/EventFormDialog";
import { SessionFormDialog } from "@/components/entrenamientos/SessionFormDialog";
import { MeetingFormDialog } from "@/components/coordinacion/MeetingFormDialog";
import { TripFormDialog } from "@/components/viajes/TripFormDialog";

interface Props {
  clubId: string | null;
  userId: string;
  /** Equipos donde puede crear eventos genéricos (Agenda / Mes). */
  genericTeams: TeamOption[];
  /** Equipo del filtro activo, si lo hay. */
  defaultTeamId?: string | null;
  /** Día preseleccionado (vista Mes). */
  defaultDate?: Date;
}

type Kind = EventType;

/**
 * Botón "Nuevo evento" de la Agenda.
 *
 * Cada tipo de evento nace en su módulo de origen (entrenamiento -> sesión,
 * junta -> Coordinación, viaje -> Viajes), de modo que el evento del
 * calendario queda conectado con su ficha y su plan. Solo se ofrecen los
 * tipos donde la persona es editora en al menos un equipo.
 */
export function NewEventLauncher({ clubId, userId, genericTeams, defaultTeamId, defaultDate }: Props) {
  const trainingTeams = useEditableTeams("entrenamientos");
  const meetingTeams = useEditableTeams("coordinacion_interna");
  const tripTeams = useEditableTeams("viajes");
  const matchTeams = useEditableTeams("partidos");

  const [chooserOpen, setChooserOpen] = React.useState(false);
  const [kind, setKind] = React.useState<Kind | null>(null);

  const options = React.useMemo(() => {
    const list: { key: Kind; teams: TeamOption[] }[] = [
      { key: "entrenamiento", teams: trainingTeams },
      { key: "partido", teams: matchTeams },
      { key: "viaje", teams: tripTeams },
      { key: "junta", teams: meetingTeams },
      { key: "evento_especial", teams: genericTeams },
    ];
    return list.filter((o) => o.teams.length > 0);
  }, [trainingTeams, matchTeams, tripTeams, meetingTeams, genericTeams]);

  if (!clubId || options.length === 0) return null;

  const teamsFor = (k: Kind): TeamOption[] =>
    options.find((o) => o.key === k)?.teams ?? [];

  const pick = (k: Kind) => {
    setChooserOpen(false);
    setKind(k);
  };

  const close = () => setKind(null);
  const defaultTeamFor = (k: Kind) => {
    const teams = teamsFor(k);
    if (defaultTeamId && teams.some((t) => t.id === defaultTeamId)) return defaultTeamId;
    return teams[0]?.id ?? null;
  };

  return (
    <>
      <Button onClick={() => setChooserOpen(true)} className="w-full glow-primary">
        <Plus className="mr-2 h-4 w-4" /> Nuevo evento
      </Button>

      <EntitySheet open={chooserOpen} onOpenChange={setChooserOpen}>
        <EntitySheetHeader>
          <EntitySheetTitle>Nuevo evento</EntitySheetTitle>
          <EntitySheetDescription>
            Cada tipo se crea en su módulo para que quede conectado con su ficha.
          </EntitySheetDescription>
        </EntitySheetHeader>
        <EntitySheetBody>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {options.map(({ key }) => {
              const def = EVENT_TYPE_MAP[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => pick(key)}
                  className="glass flex flex-col items-center gap-2 p-4 text-center transition-colors hover:bg-white/[0.06]"
                >
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${def.cssVar}20`, color: def.cssVar }}
                  >
                    <def.icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium text-foreground">{def.label}</span>
                </button>
              );
            })}
          </div>
        </EntitySheetBody>
      </EntitySheet>

      {kind === "entrenamiento" ? (
        <SessionFormDialog
          open
          onOpenChange={(v) => !v && close()}
          clubId={clubId}
          userId={userId}
          teams={teamsFor("entrenamiento")}
          defaultTeamId={defaultTeamFor("entrenamiento")}
        />
      ) : null}

      {kind === "junta" ? (
        <MeetingFormDialog
          open
          onOpenChange={(v) => !v && close()}
          clubId={clubId}
          userId={userId}
          teams={teamsFor("junta")}
        />
      ) : null}

      {kind === "viaje" ? (
        <TripFormDialog
          open
          onOpenChange={(v) => !v && close()}
          clubId={clubId}
          userId={userId}
          teams={teamsFor("viaje")}
          defaultTeamId={defaultTeamFor("viaje")}
        />
      ) : null}

      {kind === "evento_especial" ? (
        <EventFormDialog
          open
          onOpenChange={(v) => !v && close()}
          clubId={clubId}
          teams={teamsFor("evento_especial")}
          defaultTeamId={defaultTeamFor("evento_especial")}
          userId={userId}
          defaultDate={defaultDate}
          fixedType="evento_especial"
        />
      ) : null}

      {kind === "partido" ? (
        <EntitySheet open onOpenChange={(v) => !v && close()} size="md">
          <EntitySheetHeader>
            <EntitySheetTitle>Los partidos se crean en Partidos</EntitySheetTitle>
            <EntitySheetDescription>
              Así el partido queda con su convocatoria, logística y resultado, y aparece solo en la Agenda.
            </EntitySheetDescription>
          </EntitySheetHeader>
          <EntitySheetBody>
            <Link to="/m/$module" params={{ module: "partidos" }} onClick={close}>
              <Button className="w-full glow-primary">
                Ir a Partidos <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </EntitySheetBody>
        </EntitySheet>
      ) : null}
    </>
  );
}
