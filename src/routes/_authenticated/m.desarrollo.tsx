import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BarChart3,
  Dumbbell,
  EyeOff,
  MessageSquareQuote,
  Plus,
  Ruler,
  Target,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { CardGridSkeleton } from "@/components/squad/LoadingState";
import { StandardCard } from "@/components/squad/StandardCard";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { TeamBadge } from "@/components/squad/TeamFilter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useApp } from "@/components/squad/AppLayout";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { useEditableTeams } from "@/hooks/useEditableTeams";
import {
  ASSIGNMENT_STATUS_LABEL,
  GOAL_STATUS_LABEL,
  averageScore,
  daysUntil,
  formatDay,
  useAssessments,
  useCompetitionStats,
  useDevelopmentRoster,
  useFeedback,
  useGoals,
  useMeasurements,
  useRoutines,
  type AssessmentRow,
  type CompetitionStatsRow,
  type DevelopmentRosterMember,
  type FeedbackRow,
  type GoalRow,
  type MeasurementRow,
  type RoutineRow,
} from "@/hooks/useDevelopment";
import { ASSIGNMENT_STATUS_VARIANT, GOAL_STATUS_VARIANT, levelLabel } from "@/lib/desarrollo";
import { FeedbackFormDialog } from "@/components/desarrollo/FeedbackFormDialog";
import { GoalFormDialog } from "@/components/desarrollo/GoalFormDialog";
import { AssessmentFormDialog } from "@/components/desarrollo/AssessmentFormDialog";
import { RoutineFormDialog } from "@/components/desarrollo/RoutineFormDialog";
import { RoutineAssignDialog } from "@/components/desarrollo/RoutineAssignDialog";
import { MeasurementFormDialog } from "@/components/desarrollo/MeasurementFormDialog";
import { StatsFormDialog } from "@/components/desarrollo/StatsFormDialog";
import {
  PlayerDevelopmentContent,
  PlayerDevelopmentSheet,
} from "@/components/desarrollo/PlayerDevelopmentSheet";
import { FeedbackDetailSheet } from "@/components/desarrollo/FeedbackDetailSheet";
import { GoalDetailSheet } from "@/components/desarrollo/GoalDetailSheet";
import { AssessmentDetailSheet } from "@/components/desarrollo/AssessmentDetailSheet";
import { RoutineDetailSheet } from "@/components/desarrollo/RoutineDetailSheet";
import {
  DesarrolloFilters,
  EMPTY_DESARROLLO_FILTERS,
  type DesarrolloFilterState,
} from "@/components/desarrollo/DesarrolloFilters";

export const Route = createFileRoute("/_authenticated/m/desarrollo")({
  head: () => ({
    meta: [
      { title: "Squad — Desarrollo" },
      {
        name: "description",
        content: "Seguimiento del progreso del jugador: evaluaciones, objetivos, rutinas y métricas.",
      },
      { property: "og:title", content: "Squad — Desarrollo" },
      {
        property: "og:description",
        content: "Evaluaciones por habilidades, objetivos, notas, rutinas y estadísticas del jugador.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DesarrolloPage,
});

type SubView = "jugadores" | "evaluaciones" | "objetivos" | "notas" | "rutinas" | "metricas" | "stats";

function DesarrolloPage() {
  const { profile, user, isSuperAdmin, accessibleModules, teamOptions } = useApp();
  const clubId = profile?.club_id ?? null;
  const canAccess = isSuperAdmin || accessibleModules.includes("desarrollo");
  const { canEditTeam, canReadTeam, onlyOwnRows } = useTeamAccess("desarrollo");
  const editableTeams = useEditableTeams("desarrollo");

  const seesOwnOnly = React.useCallback(
    (teamId: string, playerUserId: string) => !onlyOwnRows(teamId) || playerUserId === user.id,
    [onlyOwnRows, user.id],
  );

  const [view, setView] = React.useState<SubView>("jugadores");
  const [filters, setFilters] = React.useState<DesarrolloFilterState>(EMPTY_DESARROLLO_FILTERS);

  const [feedbackOpen, setFeedbackOpen] = React.useState(false);
  const [editingFeedback, setEditingFeedback] = React.useState<FeedbackRow | null>(null);
  const [goalOpen, setGoalOpen] = React.useState(false);
  const [editingGoal, setEditingGoal] = React.useState<GoalRow | null>(null);
  const [assessOpen, setAssessOpen] = React.useState(false);
  const [editingAssessment, setEditingAssessment] = React.useState<AssessmentRow | null>(null);
  const [routineOpen, setRoutineOpen] = React.useState(false);
  const [editingRoutine, setEditingRoutine] = React.useState<RoutineRow | null>(null);
  const [assignRoutine, setAssignRoutine] = React.useState<RoutineRow | null>(null);
  const [measurementOpen, setMeasurementOpen] = React.useState(false);
  const [editingMeasurement, setEditingMeasurement] = React.useState<MeasurementRow | null>(null);
  const [statsOpen, setStatsOpen] = React.useState(false);
  const [editingStats, setEditingStats] = React.useState<CompetitionStatsRow | null>(null);

  const [detailPlayer, setDetailPlayer] = React.useState<DevelopmentRosterMember | null>(null);
  const [detailFeedback, setDetailFeedback] = React.useState<FeedbackRow | null>(null);
  const [detailGoal, setDetailGoal] = React.useState<GoalRow | null>(null);
  const [detailAssessment, setDetailAssessment] = React.useState<AssessmentRow | null>(null);
  const [detailRoutine, setDetailRoutine] = React.useState<RoutineRow | null>(null);

  const rosterQ = useDevelopmentRoster(canAccess ? clubId : null);
  const feedbackQ = useFeedback(canAccess ? clubId : null);
  const goalsQ = useGoals(canAccess ? clubId : null);
  const assessmentsQ = useAssessments(canAccess ? clubId : null);
  const routinesQ = useRoutines(canAccess ? clubId : null);
  const measurementsQ = useMeasurements(canAccess ? clubId : null);
  const statsQ = useCompetitionStats(canAccess ? clubId : null);

  const roster = React.useMemo(
    () => (rosterQ.data ?? []).filter((p) => canReadTeam(p.teamId) && seesOwnOnly(p.teamId, p.userId)),
    [rosterQ.data, canReadTeam, seesOwnOnly],
  );
  const editablePlayers = React.useMemo(
    () => roster.filter((p) => canEditTeam(p.teamId)),
    [roster, canEditTeam],
  );
  const canEditAny = editablePlayers.length > 0 || editableTeams.length > 0;

  /** Vista jugador: solo se ve a sí mismo, entra directo a "Mi desarrollo". */
  const myRow = roster.find((p) => p.userId === user.id) ?? null;
  const isPlayerOnlyView = roster.length > 0 && roster.every((p) => p.userId === user.id);

  const teamChoices = React.useMemo(
    () => teamOptions.filter((t) => !!t.id).map((t) => ({ id: t.id as string, name: t.name })),
    [teamOptions],
  );

  const q = filters.search.trim().toLowerCase();
  const matchTeam = (teamId: string) => !filters.teamId || filters.teamId === teamId;
  const byName = (name: string | null | undefined) => !q || (name ?? "").toLowerCase().includes(q);

  const allAssessments = (assessmentsQ.data ?? []).filter((a) =>
    seesOwnOnly(a.team_id, a.player_user_id),
  );
  const allGoals = (goalsQ.data ?? []).filter((g) => seesOwnOnly(g.team_id, g.player_user_id));

  const lastAssessmentByUser = React.useMemo(() => {
    const m = new Map<string, AssessmentRow>();
    for (const a of allAssessments) {
      const prev = m.get(a.player_user_id);
      if (!prev || a.assessment_date.localeCompare(prev.assessment_date) > 0) m.set(a.player_user_id, a);
    }
    return m;
  }, [allAssessments]);

  const filteredRoster = roster.filter((p) => {
    if (!matchTeam(p.teamId) || !byName(p.fullName)) return false;
    if (filters.onlyEvaluated && !lastAssessmentByUser.has(p.userId)) return false;
    if (filters.goalStatus) {
      const has = allGoals.some((g) => g.player_user_id === p.userId && g.status === filters.goalStatus);
      if (!has) return false;
    }
    return true;
  });

  const feedback = (feedbackQ.data ?? []).filter(
    (f) => matchTeam(f.team_id) && seesOwnOnly(f.team_id, f.player_user_id) && byName(f.player?.full_name),
  );
  const goals = allGoals.filter(
    (g) =>
      matchTeam(g.team_id) &&
      byName(g.player?.full_name) &&
      (!filters.goalStatus || g.status === filters.goalStatus),
  );
  const assessments = allAssessments.filter(
    (a) => matchTeam(a.team_id) && byName(a.player?.full_name),
  );
  const routines = (routinesQ.data ?? []).filter((r) => matchTeam(r.team_id) && (!q || byName(r.name)));
  const measurements = (measurementsQ.data ?? []).filter(
    (m) => matchTeam(m.team_id) && seesOwnOnly(m.team_id, m.player_user_id) && byName(m.player?.full_name),
  );
  const stats = (statsQ.data ?? []).filter(
    (s) => matchTeam(s.team_id) && seesOwnOnly(s.team_id, s.player_user_id) && byName(s.player?.full_name),
  );

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <ModuleTabs activeKey="desarrollo" />
        <PageHeader hideTitle title="Desarrollo" subtitle="Evaluaciones y progresos" />
        <EmptyState
          icon={TrendingUp}
          title="Sin acceso"
          message="Tu rol actual no tiene permisos para este módulo."
        />
      </div>
    );
  }

  /* ------------------------------- Vista jugador ------------------------------- */
  if (isPlayerOnlyView) {
    return (
      <div className="space-y-6">
        <ModuleTabs activeKey="desarrollo" />
        <PageHeader hideTitle title="Mi desarrollo" subtitle="Tu progreso deportivo" />
        <PlayerDevelopmentContent
          clubId={clubId}
          player={{
            userId: user.id,
            fullName: myRow?.fullName ?? profile?.full_name ?? "Mi desarrollo",
            avatarUrl: myRow?.avatarUrl ?? null,
            teamName: myRow?.teamName ?? null,
            position: myRow?.position ?? null,
            jerseyNumber: myRow?.jerseyNumber ?? null,
          }}
          isSelf
        />
      </div>
    );
  }

  /* ------------------------------ Cuerpo técnico ------------------------------ */
  const primaryAction = () => {
    if (view === "notas") {
      setEditingFeedback(null);
      setFeedbackOpen(true);
    } else if (view === "objetivos") {
      setEditingGoal(null);
      setGoalOpen(true);
    } else if (view === "evaluaciones") {
      setEditingAssessment(null);
      setAssessOpen(true);
    } else if (view === "rutinas") {
      setEditingRoutine(null);
      setRoutineOpen(true);
    } else if (view === "metricas") {
      setEditingMeasurement(null);
      setMeasurementOpen(true);
    } else if (view === "stats") {
      setEditingStats(null);
      setStatsOpen(true);
    }
  };

  const actionLabel: Record<SubView, string> = {
    jugadores: "",
    evaluaciones: "Nueva evaluación",
    objetivos: "Nuevo objetivo",
    notas: "Registrar nota",
    rutinas: "Nueva rutina",
    metricas: "Nueva medición",
    stats: "Capturar estadísticas",
  };

  return (
    <div className="space-y-6">
      <ModuleTabs activeKey="desarrollo" />
      <PageHeader hideTitle title="Desarrollo" subtitle="Evaluaciones y progresos" />

      <DesarrolloFilters
        value={filters}
        onChange={setFilters}
        teams={teamChoices}
        count={filteredRoster.length}
      />

      <Tabs value={view} onValueChange={(v) => setView(v as SubView)} className="space-y-4">
        <div className="-mx-1 overflow-x-auto px-1">
          <TabsList className="inline-flex w-auto">
            <TabsTrigger value="jugadores">Jugadores</TabsTrigger>
            <TabsTrigger value="evaluaciones">Evaluaciones</TabsTrigger>
            <TabsTrigger value="objetivos">Objetivos</TabsTrigger>
            <TabsTrigger value="notas">Notas</TabsTrigger>
            <TabsTrigger value="rutinas">Rutinas</TabsTrigger>
            <TabsTrigger value="metricas">Métricas</TabsTrigger>
            <TabsTrigger value="stats">Competencia</TabsTrigger>
          </TabsList>
        </div>

        {canEditAny && view !== "jugadores" ? (
          <Button className="w-full glow-primary" onClick={primaryAction}>
            <Plus className="mr-2 h-4 w-4" /> {actionLabel[view]}
          </Button>
        ) : null}

        <TabsContent value="jugadores" className="space-y-3">
          {rosterQ.isLoading ? (
            <CardGridSkeleton count={4} />
          ) : filteredRoster.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="Sin jugadores visibles"
              message="Solo ves el desarrollo de las categorías donde tienes acceso."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredRoster.map((p) => {
                const avg = averageScore(lastAssessmentByUser.get(p.userId));
                const level = levelLabel(avg);
                const active = allGoals.filter(
                  (g) =>
                    g.player_user_id === p.userId &&
                    (g.status === "pendiente" || g.status === "en_progreso"),
                ).length;
                return (
                  <button
                    key={p.playerId}
                    type="button"
                    onClick={() => setDetailPlayer(p)}
                    className="glass flex items-center gap-3 p-4 text-left transition-all hover:border-white/15 hover:bg-white/[0.06] active:scale-[0.99]"
                  >
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarImage src={p.avatarUrl ?? undefined} alt="" />
                      <AvatarFallback>{(p.fullName ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="truncate font-display font-semibold text-foreground">
                        {p.fullName ?? "—"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.teamName ?? "—"}
                        {p.position ? ` · ${p.position}` : ""}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <StatusBadge variant={level.variant}>
                          {avg != null ? `${level.label} · ${avg}/10` : level.label}
                        </StatusBadge>
                        {active > 0 ? (
                          <StatusBadge variant="info">{active} objetivo(s)</StatusBadge>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="evaluaciones" className="space-y-3">
          {assessmentsQ.isLoading ? (
            <CardGridSkeleton count={3} />
          ) : assessments.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="Sin evaluaciones"
              message="Registra la primera evaluación por habilidades para ver la evolución."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {assessments.map((a) => (
                <StandardCard
                  key={a.id}
                  icon={TrendingUp}
                  title={a.player?.full_name ?? "Jugador"}
                  subtitle={formatDay(a.assessment_date)}
                  interactive
                  onClick={() => setDetailAssessment(a)}
                  action={<TeamBadge name={a.team?.name} />}
                >
                  <div className="space-y-1">
                    <p>Promedio {averageScore(a) ?? "—"}/10</p>
                    <p className="text-xs text-muted-foreground">
                      {(a.scores ?? []).map((s) => `${s.attribute} ${s.score}`).join(" · ")}
                    </p>
                  </div>
                </StandardCard>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="objetivos" className="space-y-3">
          {goalsQ.isLoading ? (
            <CardGridSkeleton count={3} />
          ) : goals.length === 0 ? (
            <EmptyState icon={Target} title="Sin objetivos" message="Aún no hay metas definidas." />
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {goals.map((g) => {
                const d = daysUntil(g.target_date);
                const overdue =
                  d != null && d < 0 && (g.status === "pendiente" || g.status === "en_progreso");
                return (
                  <StandardCard
                    key={g.id}
                    icon={Target}
                    title={g.title}
                    subtitle={g.player?.full_name ?? "Jugador"}
                    status={{ label: GOAL_STATUS_LABEL[g.status], variant: GOAL_STATUS_VARIANT[g.status] }}
                    interactive
                    className={overdue ? "border-destructive/50" : undefined}
                    onClick={() => setDetailGoal(g)}
                  >
                    <div className="space-y-1">
                      {g.description ? <p className="line-clamp-2">{g.description}</p> : null}
                      {g.target_date ? (
                        <p className={overdue ? "text-destructive" : undefined}>
                          Meta: {formatDay(g.target_date)}
                          {d != null ? (overdue ? ` · vencido ${Math.abs(d)} d` : ` · en ${d} d`) : ""}
                        </p>
                      ) : null}
                      <TeamBadge name={g.team?.name} />
                    </div>
                  </StandardCard>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notas" className="space-y-3">
          {feedbackQ.isLoading ? (
            <CardGridSkeleton count={3} />
          ) : feedback.length === 0 ? (
            <EmptyState
              icon={MessageSquareQuote}
              title="Sin notas"
              message="Aún no se ha registrado retroalimentación."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {feedback.map((f) => (
                <StandardCard
                  key={f.id}
                  icon={MessageSquareQuote}
                  title={f.player?.full_name ?? "Jugador"}
                  subtitle={f.context ?? formatDay(f.feedback_date)}
                  interactive
                  onClick={() => setDetailFeedback(f)}
                  action={
                    f.visible_to_player ? (
                      <TeamBadge name={f.team?.name} />
                    ) : (
                      <StatusBadge variant="neutral">
                        <EyeOff className="mr-1 h-3 w-3" /> Interna
                      </StatusBadge>
                    )
                  }
                >
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{formatDay(f.feedback_date)}</p>
                    <p className="line-clamp-3 whitespace-pre-wrap">{f.content}</p>
                  </div>
                </StandardCard>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rutinas" className="space-y-3">
          {routinesQ.isLoading ? (
            <CardGridSkeleton count={3} />
          ) : routines.length === 0 ? (
            <EmptyState icon={Dumbbell} title="Sin rutinas" message="Crea el primer plan individual." />
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {routines.map((r) => (
                <StandardCard
                  key={r.id}
                  icon={Dumbbell}
                  title={r.name}
                  subtitle={r.category ?? `${(r.exercises ?? []).length} ejercicio(s)`}
                  interactive
                  onClick={() => setDetailRoutine(r)}
                  action={<TeamBadge name={r.team?.name} />}
                >
                  <div className="space-y-2">
                    {r.description ? <p className="line-clamp-2">{r.description}</p> : null}
                    <div className="flex flex-wrap gap-1.5">
                      {(r.assignments ?? []).slice(0, 6).map((a) => (
                        <StatusBadge key={a.id} variant={ASSIGNMENT_STATUS_VARIANT[a.status]}>
                          {(a.player?.full_name ?? "—").split(" ")[0]} · {ASSIGNMENT_STATUS_LABEL[a.status]}
                        </StatusBadge>
                      ))}
                    </div>
                  </div>
                </StandardCard>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="metricas" className="space-y-3">
          {measurementsQ.isLoading ? (
            <CardGridSkeleton count={3} />
          ) : measurements.length === 0 ? (
            <EmptyState
              icon={Ruler}
              title="Sin mediciones"
              message="Registra peso, estatura o pruebas físicas para seguir su evolución."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {measurements.map((m) => (
                <StandardCard
                  key={m.id}
                  icon={Ruler}
                  title={`${m.metric}: ${m.value}${m.unit ? ` ${m.unit}` : ""}`}
                  subtitle={m.player?.full_name ?? "Jugador"}
                  interactive={canEditTeam(m.team_id)}
                  onClick={
                    canEditTeam(m.team_id)
                      ? () => {
                          setEditingMeasurement(m);
                          setMeasurementOpen(true);
                        }
                      : undefined
                  }
                  action={<TeamBadge name={m.team?.name} />}
                >
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{formatDay(m.measured_on)}</p>
                    {m.notes ? <p className="line-clamp-2">{m.notes}</p> : null}
                  </div>
                </StandardCard>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="space-y-3">
          {statsQ.isLoading ? (
            <CardGridSkeleton count={3} />
          ) : stats.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="Sin estadísticas"
              message="Captura partidos, minutos y goles por temporada. Más adelante llegarán desde Torneo."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {stats.map((s) => (
                <StandardCard
                  key={s.id}
                  icon={BarChart3}
                  title={s.player?.full_name ?? "Jugador"}
                  subtitle={s.season_name}
                  interactive={canEditTeam(s.team_id) && s.source === "manual"}
                  onClick={
                    canEditTeam(s.team_id) && s.source === "manual"
                      ? () => {
                          setEditingStats(s);
                          setStatsOpen(true);
                        }
                      : undefined
                  }
                  action={<TeamBadge name={s.team?.name} />}
                >
                  <p>
                    {s.matches_played} PJ · {s.minutes_played} min · {s.goals} goles · {s.assists} asist.
                  </p>
                </StandardCard>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {clubId ? (
        <>
          <FeedbackFormDialog
            open={feedbackOpen}
            onOpenChange={(v) => {
              setFeedbackOpen(v);
              if (!v) setEditingFeedback(null);
            }}
            clubId={clubId}
            userId={user.id}
            players={editablePlayers}
            feedback={editingFeedback}
          />
          <GoalFormDialog
            open={goalOpen}
            onOpenChange={(v) => {
              setGoalOpen(v);
              if (!v) setEditingGoal(null);
            }}
            clubId={clubId}
            userId={user.id}
            players={editablePlayers}
            goal={editingGoal}
          />
          <AssessmentFormDialog
            open={assessOpen}
            onOpenChange={(v) => {
              setAssessOpen(v);
              if (!v) setEditingAssessment(null);
            }}
            clubId={clubId}
            userId={user.id}
            players={editablePlayers}
            assessment={editingAssessment}
          />
          <RoutineFormDialog
            open={routineOpen}
            onOpenChange={(v) => {
              setRoutineOpen(v);
              if (!v) setEditingRoutine(null);
            }}
            clubId={clubId}
            userId={user.id}
            teams={editableTeams}
            routine={editingRoutine}
          />
          <RoutineAssignDialog
            open={!!assignRoutine}
            onOpenChange={(v) => !v && setAssignRoutine(null)}
            clubId={clubId}
            userId={user.id}
            routine={assignRoutine}
            players={editablePlayers}
          />
          <MeasurementFormDialog
            open={measurementOpen}
            onOpenChange={(v) => {
              setMeasurementOpen(v);
              if (!v) setEditingMeasurement(null);
            }}
            clubId={clubId}
            userId={user.id}
            players={editablePlayers}
            measurement={editingMeasurement}
          />
          <StatsFormDialog
            open={statsOpen}
            onOpenChange={(v) => {
              setStatsOpen(v);
              if (!v) setEditingStats(null);
            }}
            clubId={clubId}
            userId={user.id}
            players={editablePlayers}
            stats={editingStats}
          />
        </>
      ) : null}

      <PlayerDevelopmentSheet
        open={!!detailPlayer}
        onOpenChange={(v) => !v && setDetailPlayer(null)}
        clubId={clubId}
        player={
          detailPlayer
            ? {
                userId: detailPlayer.userId,
                fullName: detailPlayer.fullName,
                avatarUrl: detailPlayer.avatarUrl,
                teamName: detailPlayer.teamName,
                position: detailPlayer.position,
                jerseyNumber: detailPlayer.jerseyNumber,
              }
            : null
        }
        isSelf={detailPlayer?.userId === user.id}
      />

      <FeedbackDetailSheet
        open={!!detailFeedback}
        onOpenChange={(v) => !v && setDetailFeedback(null)}
        feedback={detailFeedback}
        canEdit={!!detailFeedback && canEditTeam(detailFeedback.team_id)}
        clubId={clubId}
        userId={user.id}
        players={editablePlayers}
      />
      <GoalDetailSheet
        open={!!detailGoal}
        onOpenChange={(v) => !v && setDetailGoal(null)}
        goal={detailGoal}
        canEdit={!!detailGoal && canEditTeam(detailGoal.team_id)}
        clubId={clubId}
        userId={user.id}
        players={editablePlayers}
      />
      <AssessmentDetailSheet
        open={!!detailAssessment}
        onOpenChange={(v) => !v && setDetailAssessment(null)}
        assessment={detailAssessment}
        canEdit={!!detailAssessment && canEditTeam(detailAssessment.team_id)}
        clubId={clubId}
        userId={user.id}
        players={editablePlayers}
      />
      <RoutineDetailSheet
        open={!!detailRoutine}
        onOpenChange={(v) => !v && setDetailRoutine(null)}
        routine={detailRoutine}
        canEdit={!!detailRoutine && canEditTeam(detailRoutine.team_id)}
        clubId={clubId}
        userId={user.id}
        teams={editableTeams}
        onAssign={(r) => setAssignRoutine(r)}
      />
    </div>
  );
}
