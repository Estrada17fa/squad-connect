import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Dumbbell, Library, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { CardGridSkeleton } from "@/components/squad/LoadingState";
import { TeamFilter } from "@/components/squad/TeamFilter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/components/squad/AppLayout";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { useEditableTeams } from "@/hooks/useEditableTeams";
import {
  CATEGORY_LABEL,
  EXERCISE_CATEGORIES,
  formatSessionDate,
  useExercises,
  useTrainingSessions,
  type ExerciseRow,
  type TrainingSessionRow,
} from "@/hooks/useTraining";
import { ExerciseFormDialog } from "@/components/entrenamientos/ExerciseFormDialog";
import { SessionFormDialog } from "@/components/entrenamientos/SessionFormDialog";
import { SessionDetailSheet } from "@/components/entrenamientos/SessionDetailSheet";

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
  const [teamFilter, setTeamFilter] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState<string>("todas");

  const [sessionFormOpen, setSessionFormOpen] = React.useState(false);
  const [editingSession, setEditingSession] = React.useState<TrainingSessionRow | null>(null);
  const [detailSession, setDetailSession] = React.useState<TrainingSessionRow | null>(null);
  const [exerciseOpen, setExerciseOpen] = React.useState(false);
  const [editingExercise, setEditingExercise] = React.useState<ExerciseRow | null>(null);

  const sessionsQ = useTrainingSessions(canAccess ? clubId : null);
  const exercisesQ = useExercises(canAccess ? clubId : null);

  const q = search.trim().toLowerCase();
  const matchTeam = (teamId: string | null) => !teamFilter || teamFilter === teamId;

  const sessions = (sessionsQ.data ?? []).filter(
    (s) => canReadTeam(s.team_id) && matchTeam(s.team_id) && (!q || s.title.toLowerCase().includes(q)),
  );
  const exercises = (exercisesQ.data ?? []).filter(
    (e) =>
      (e.team_id ? canReadTeam(e.team_id) : true) &&
      (!teamFilter || !e.team_id || e.team_id === teamFilter) &&
      (category === "todas" || e.category === category) &&
      (!q || e.name.toLowerCase().includes(q)),
  );

  const canEditAny = editableTeams.length > 0;
  const teamName = (id: string | null) => teamOptions.find((t) => t.id === id)?.name ?? null;

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
  const upcoming = sessions.filter((s) => new Date(s.session_date).getTime() >= now).reverse();
  const past = sessions.filter((s) => new Date(s.session_date).getTime() < now);

  function renderSessionCard(s: TrainingSessionRow) {
    return (
      <button
        key={s.id}
        type="button"
        onClick={() => setDetailSession(s)}
        className="glass w-full p-4 text-left transition-all hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.99]"
      >
        <div className="flex items-start justify-between gap-2">
          <p className="min-w-0 truncate font-display font-semibold text-foreground">{s.title}</p>
          {s.event_id ? <CalendarDays className="h-4 w-4 shrink-0 text-primary" /> : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {formatSessionDate(s.session_date)}
          {teamName(s.team_id) ? ` · ${teamName(s.team_id)}` : ""}
        </p>
        {s.objective ? <p className="mt-2 line-clamp-2 text-sm text-foreground/80">{s.objective}</p> : null}
      </button>
    );
  }

  return (
    <div className="space-y-6">
      <ModuleTabs activeKey="entrenamientos" />
      <PageHeader hideTitle title="Entrenamientos" subtitle="Sesiones del equipo y biblioteca" />
      <TeamFilter teams={teamOptions} value={teamFilter} onChange={setTeamFilter} />

      <Tabs value={view} onValueChange={(v) => setView(v as SubView)} className="space-y-4">
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
                setSessionFormOpen(true);
              } else {
                setEditingExercise(null);
                setExerciseOpen(true);
              }
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            {view === "sesiones" ? "Nueva sesión" : "Nuevo ejercicio"}
          </Button>
        ) : null}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar…"
            className="pl-9"
          />
        </div>

        <TabsContent value="sesiones" className="space-y-4">
          {sessionsQ.isLoading ? (
            <CardGridSkeleton count={3} />
          ) : sessions.length === 0 ? (
            <EmptyState
              icon={Dumbbell}
              title="Sin sesiones"
              message="Aún no hay sesiones de entrenamiento planeadas para tus equipos."
            />
          ) : (
            <>
              {upcoming.length ? (
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Próximas</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {upcoming.map(renderSessionCard)}
                  </div>
                </div>
              ) : null}
              {past.length ? (
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Pasadas</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{past.map(renderSessionCard)}</div>
                </div>
              ) : null}
            </>
          )}
        </TabsContent>

        <TabsContent value="biblioteca" className="space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[{ key: "todas", label: "Todas" }, ...EXERCISE_CATEGORIES].map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setCategory(c.key)}
                className={
                  "shrink-0 rounded-full px-3 py-1 text-xs transition-colors " +
                  (category === c.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/[0.06] text-muted-foreground hover:text-foreground")
                }
              >
                {c.label}
              </button>
            ))}
          </div>

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
              {exercises.map((ex) => {
                const editable = canEditTeam(ex.team_id) || (!ex.team_id && canEditAny);
                return (
                  <button
                    key={ex.id}
                    type="button"
                    onClick={() => {
                      if (!editable) return;
                      setEditingExercise(ex);
                      setExerciseOpen(true);
                    }}
                    className="glass p-4 text-left transition-all hover:border-white/15 hover:bg-white/[0.06]"
                  >
                    <p className="truncate font-display font-semibold text-foreground">{ex.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {CATEGORY_LABEL[ex.category]}
                      {ex.duration_minutes ? ` · ${ex.duration_minutes} min` : ""}
                      {ex.team_id ? ` · ${teamName(ex.team_id) ?? "Equipo"}` : " · Club"}
                    </p>
                    {ex.objective ? (
                      <p className="mt-2 line-clamp-2 text-sm text-foreground/80">{ex.objective}</p>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {clubId ? (
        <>
          <SessionFormDialog
            open={sessionFormOpen}
            onOpenChange={setSessionFormOpen}
            clubId={clubId}
            userId={userId}
            teams={editableTeams}
            defaultTeamId={teamFilter}
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
        readOnly={!detailSession || !canEditTeam(detailSession.team_id)}
        onEdit={() => {
          setEditingSession(detailSession);
          setDetailSession(null);
          setSessionFormOpen(true);
        }}
      />
    </div>
  );
}
