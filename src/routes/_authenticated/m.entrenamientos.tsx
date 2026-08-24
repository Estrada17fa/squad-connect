import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Dumbbell, Library, Plus } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { CardGridSkeleton } from "@/components/squad/LoadingState";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/components/squad/AppLayout";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { useEditableTeams } from "@/hooks/useEditableTeams";
import { calendarEventsQueryOptions, type CalendarEventRow } from "@/hooks/useCalendarEvents";
import {
  PHASE_LABEL,
  formatSessionDate,
  useExercises,
  useSessionSummaries,
  useTrainingSessions,
  type ExerciseRow,
  type TrainingSessionRow,
} from "@/hooks/useTraining";
import { ExerciseFormDialog } from "@/components/entrenamientos/ExerciseFormDialog";
import { SessionFormDialog } from "@/components/entrenamientos/SessionFormDialog";
import { SessionDetailSheet } from "@/components/entrenamientos/SessionDetailSheet";
import { ExerciseDetailSheet } from "@/components/entrenamientos/ExerciseDetailSheet";
import {
  ExerciseCard,
  PendingPlanCard,
  PlanSummaryChips,
  TrainingChip,
} from "@/components/entrenamientos/TrainingPieces";
import {
  EMPTY_TRAINING_FILTERS,
  EntrenamientosFilters,
  type TrainingFilterState,
} from "@/components/entrenamientos/EntrenamientosFilters";

export const Route = createFileRoute("/_authenticated/m/entrenamientos")({
  head: () => ({
    meta: [
      { title: "Squad — Entrenamientos" },
      {
        name: "description",
        content: "Sesiones colectivas del equipo y biblioteca de ejercicios reutilizables.",
      },
      { property: "og:title", content: "Squad — Entrenamientos" },
      {
        property: "og:description",
        content: "Planea sesiones por fases y consulta qué se va a entrenar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EntrenamientosPage,
});

type SubView = "sesiones" | "biblioteca";

function EntrenamientosPage() {
  const { profile, user, teamOptions, isSuperAdmin, accessibleModules } = useApp();
  const clubId = profile?.club_id ?? null;
  const userId = user?.id ?? "";
  const canAccess = isSuperAdmin || accessibleModules.includes("entrenamientos");
  const { canEditTeam, canReadTeam } = useTeamAccess("entrenamientos");
  const editableTeams = useEditableTeams("entrenamientos");

  const [view, setView] = React.useState<SubView>("sesiones");
  const [filters, setFilters] = React.useState<TrainingFilterState>(EMPTY_TRAINING_FILTERS);

  const [sessionFormOpen, setSessionFormOpen] = React.useState(false);
  const [editingSession, setEditingSession] = React.useState<TrainingSessionRow | null>(null);
  const [pendingEvent, setPendingEvent] = React.useState<CalendarEventRow | null>(null);
  const [detailSession, setDetailSession] = React.useState<TrainingSessionRow | null>(null);
  const [exerciseOpen, setExerciseOpen] = React.useState(false);
  const [editingExercise, setEditingExercise] = React.useState<ExerciseRow | null>(null);
  const [detailExercise, setDetailExercise] = React.useState<ExerciseRow | null>(null);

  const sessionsQ = useTrainingSessions(canAccess ? clubId : null);
  const exercisesQ = useExercises(canAccess ? clubId : null);

  const q = filters.search.trim().toLowerCase();
  const teamName = (id: string | null) => teamOptions.find((t) => t.id === id)?.name ?? null;

  const visibleSessions = React.useMemo(
    () => (sessionsQ.data ?? []).filter((s) => canReadTeam(s.team_id)),
    [sessionsQ.data, canReadTeam],
  );
  const summariesQ = useSessionSummaries(visibleSessions.map((s) => s.id));
  const summaries = summariesQ.data ?? {};

  const sessions = visibleSessions.filter((s) => {
    if (filters.teamId && s.team_id !== filters.teamId) return false;
    if (q && !s.title.toLowerCase().includes(q) && !(s.objective ?? "").toLowerCase().includes(q))
      return false;
    const count = summaries[s.id]?.count ?? 0;
    if (filters.planned === "con" && count === 0) return false;
    if (filters.planned === "sin" && count > 0) return false;
    return true;
  });

  /**
   * "Por planear": entrenamientos ya agendados (eventos futuros) que todavía no
   * tienen ejercicios. Solo de las categorías donde el usuario puede editar.
   */
  const eventsQ = useQuery(calendarEventsQueryOptions({ mode: "club", clubId: canAccess ? clubId : null }));
  const plannedEventIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const s of visibleSessions) {
      if (s.event_id && (summaries[s.id]?.count ?? 0) > 0) ids.add(s.event_id);
    }
    return ids;
  }, [visibleSessions, summaries]);

  const pendingEvents = React.useMemo(() => {
    const nowTs = Date.now();
    return (eventsQ.data ?? [])
      .filter(
        (e) =>
          e.event_type === "entrenamiento" &&
          !!e.team_id &&
          canEditTeam(e.team_id) &&
          new Date(e.starts_at).getTime() >= nowTs &&
          !plannedEventIds.has(e.id) &&
          (!filters.teamId || e.team_id === filters.teamId),
      )
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  }, [eventsQ.data, canEditTeam, plannedEventIds, filters.teamId]);

  /** Si el evento ya tiene sesión creada (pero sin ejercicios), se edita esa. */
  const sessionByEvent = React.useMemo(() => {
    const m = new Map<string, TrainingSessionRow>();
    for (const s of visibleSessions) if (s.event_id) m.set(s.event_id, s);
    return m;
  }, [visibleSessions]);

  const exercises = (exercisesQ.data ?? []).filter((e) => {
    if (e.team_id && !canReadTeam(e.team_id)) return false;
    if (filters.teamId && e.team_id && e.team_id !== filters.teamId) return false;
    if (filters.category && e.category !== filters.category) return false;
    if (filters.scope === "club" && e.team_id) return false;
    if (filters.scope === "team" && !e.team_id) return false;
    if (filters.extra === "material" && !e.materials) return false;
    if (filters.extra === "media" && !e.media_path) return false;
    if (q && !e.name.toLowerCase().includes(q) && !(e.objective ?? "").toLowerCase().includes(q))
      return false;
    return true;
  });

  const canEditAny = editableTeams.length > 0;

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <ModuleTabs activeKey="entrenamientos" />
        <PageHeader hideTitle title="Entrenamientos" subtitle="Sesiones y ejercicios" />
        <EmptyState
          icon={Dumbbell}
          title="Sin acceso"
          message="Tu rol actual no tiene permisos para este módulo."
        />
      </div>
    );
  }

  const now = Date.now();
  const pendingIds = new Set(pendingEvents.map((e) => e.id));
  const listSessions = sessions.filter((s) => !(s.event_id && pendingIds.has(s.event_id)));
  const upcoming = listSessions.filter((s) => new Date(s.session_date).getTime() >= now).reverse();
  const past = listSessions.filter((s) => new Date(s.session_date).getTime() < now);

  function renderSessionCard(s: TrainingSessionRow) {
    const sum = summaries[s.id];
    return (
      <button
        key={s.id}
        type="button"
        onClick={() => setDetailSession(s)}
        className="glass w-full p-4 text-left transition-all hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.99]"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-primary">
              {formatSessionDate(s.session_date)}
            </p>
            <p className="mt-1 break-words font-display font-semibold text-foreground [overflow-wrap:anywhere]">
              {s.title}
            </p>
          </div>
          {s.event_id ? <CalendarDays className="h-4 w-4 shrink-0 text-primary" /> : null}
        </div>

        <div className="mt-2 flex flex-wrap gap-1.5">
          {teamName(s.team_id) ? <TrainingChip>{teamName(s.team_id)}</TrainingChip> : null}
        </div>

        {s.objective ? (
          <p className="mt-2 line-clamp-2 text-sm text-foreground/80">{s.objective}</p>
        ) : null}

        <div className="mt-2">
          {sum && sum.count > 0 ? (
            <PlanSummaryChips
              count={sum.count}
              minutes={sum.minutes}
              phases={sum.phases}
              phaseLabels={PHASE_LABEL}
            />
          ) : (
            <p className="text-xs text-muted-foreground">Sin plan de ejercicios</p>
          )}
        </div>
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <ModuleTabs activeKey="entrenamientos" />
      <PageHeader hideTitle title="Entrenamientos" subtitle="Sesiones del equipo y biblioteca" />

      <Tabs
        value={view}
        onValueChange={(v) => {
          setView(v as SubView);
          setFilters(EMPTY_TRAINING_FILTERS);
        }}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sesiones">Sesiones</TabsTrigger>
          <TabsTrigger value="biblioteca">Biblioteca</TabsTrigger>
        </TabsList>

        {canEditAny ? (
          <Button
            className="w-full glow-primary"
            onClick={() => {
              if (view === "sesiones") {
                setEditingSession(null);
                setPendingEvent(null);
                setSessionFormOpen(true);
              } else {
                setEditingExercise(null);
                setExerciseOpen(true);
              }
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {view === "sesiones" ? "Nuevo entrenamiento" : "Nuevo ejercicio"}
          </Button>
        ) : null}

        <EntrenamientosFilters
          mode={view}
          value={filters}
          onChange={setFilters}
          teams={teamOptions.flatMap((t) => (t.id ? [{ id: t.id, name: t.name }] : []))}
          count={view === "sesiones" ? listSessions.length : exercises.length}
        />

        <TabsContent value="sesiones" className="space-y-4">
          {pendingEvents.length ? (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Por planear</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {pendingEvents.map((e) => (
                  <PendingPlanCard
                    key={e.id}
                    title={e.title}
                    startsAt={e.starts_at}
                    teamLabel={teamName(e.team_id)}
                    location={e.location}
                    onClick={() => {
                      setEditingSession(sessionByEvent.get(e.id) ?? null);
                      setPendingEvent(e);
                      setSessionFormOpen(true);
                    }}
                  />
                ))}
              </div>
            </div>
          ) : null}

          {sessionsQ.isLoading ? (
            <CardGridSkeleton count={3} />
          ) : listSessions.length === 0 ? (
            pendingEvents.length ? null : (
              <EmptyState
                icon={Dumbbell}
                title="Sin entrenamientos"
                message="Aún no hay entrenamientos que coincidan con los filtros."
              />
            )
          ) : (
            <>
              {upcoming.length ? (
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Próximos</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {upcoming.map(renderSessionCard)}
                  </div>
                </div>
              ) : null}
              {past.length ? (
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Pasados</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{past.map(renderSessionCard)}</div>
                </div>
              ) : null}
            </>
          )}
        </TabsContent>

        <TabsContent value="biblioteca" className="space-y-3">
          {exercisesQ.isLoading ? (
            <CardGridSkeleton count={4} />
          ) : exercises.length === 0 ? (
            <EmptyState
              icon={Library}
              title="Biblioteca vacía"
              message="Crea ejercicios reutilizables para armar tus sesiones más rápido."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {exercises.map((ex) => (
                <ExerciseCard
                  key={ex.id}
                  exercise={ex}
                  scopeLabel={ex.team_id ? teamName(ex.team_id) ?? "Categoría" : "Club"}
                  onClick={() => setDetailExercise(ex)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {clubId ? (
        <>
          <SessionFormDialog
            open={sessionFormOpen}
            onOpenChange={(v) => {
              setSessionFormOpen(v);
              if (!v) setPendingEvent(null);
            }}
            clubId={clubId}
            userId={userId}
            teams={editableTeams}
            defaultTeamId={filters.teamId}
            pendingEvent={pendingEvent}
            session={editingSession}
          />
          <ExerciseFormDialog
            open={exerciseOpen}
            onOpenChange={setExerciseOpen}
            clubId={clubId}
            userId={userId}
            teams={editableTeams}
            exercise={editingExercise}
          />
        </>
      ) : null}

      <SessionDetailSheet
        open={!!detailSession}
        onOpenChange={(v) => !v && setDetailSession(null)}
        session={detailSession}
        teamName={detailSession ? teamName(detailSession.team_id) : null}
        readOnly={!detailSession || !canEditTeam(detailSession.team_id)}
        onEdit={() => {
          setPendingEvent(null);
          setEditingSession(detailSession);
          setDetailSession(null);
          setSessionFormOpen(true);
        }}
      />

      <ExerciseDetailSheet
        open={!!detailExercise}
        onOpenChange={(v) => !v && setDetailExercise(null)}
        exercise={detailExercise}
        canEdit={
          !!detailExercise &&
          (detailExercise.team_id ? canEditTeam(detailExercise.team_id) : canEditTeam(null))
        }
        clubId={clubId}
        userId={userId}
        teams={editableTeams}
        teamName={teamName}
      />
    </div>
  );
}
