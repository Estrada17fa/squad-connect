import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Dumbbell,
  MessageSquareQuote,
  Plus,
  Search,
  Target,
  TrendingUp,
  UserCheck,
} from "lucide-react";
import { PageHeader } from "@/components/squad/PageHeader";
import { ModuleTabs } from "@/components/squad/ModuleTabs";
import { EmptyState } from "@/components/squad/EmptyState";
import { CardGridSkeleton } from "@/components/squad/LoadingState";
import { StandardCard } from "@/components/squad/StandardCard";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { TeamFilter, TeamBadge } from "@/components/squad/TeamFilter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  useDevelopmentRoster,
  useFeedback,
  useGoals,
  useRoutines,
  type AssessmentRow,
  type DevelopmentRosterMember,
  type FeedbackRow,
  type GoalRow,
  type RoutineRow,
} from "@/hooks/useDevelopment";
import { FeedbackFormDialog } from "@/components/desarrollo/FeedbackFormDialog";
import { GoalFormDialog } from "@/components/desarrollo/GoalFormDialog";
import { AssessmentFormDialog } from "@/components/desarrollo/AssessmentFormDialog";
import { RoutineFormDialog } from "@/components/desarrollo/RoutineFormDialog";
import { RoutineAssignDialog } from "@/components/desarrollo/RoutineAssignDialog";
import {
  PlayerDevelopmentSheet,
  ASSIGNMENT_STATUS_VARIANT,
  GOAL_STATUS_VARIANT,
} from "@/components/desarrollo/PlayerDevelopmentSheet";
import { FeedbackDetailSheet } from "@/components/desarrollo/FeedbackDetailSheet";
import { GoalDetailSheet } from "@/components/desarrollo/GoalDetailSheet";
import { AssessmentDetailSheet } from "@/components/desarrollo/AssessmentDetailSheet";
import { RoutineDetailSheet } from "@/components/desarrollo/RoutineDetailSheet";

export const Route = createFileRoute("/_authenticated/m/desarrollo")({
  head: () => ({
    meta: [
      { title: "Squad — Desarrollo" },
      {
        name: "description",
        content: "Seguimiento del progreso del jugador: retro, objetivos, evaluaciones y rutinas.",
      },
      { property: "og:title", content: "Squad — Desarrollo" },
      {
        property: "og:description",
        content: "Retroalimentación, objetivos, evaluaciones por atributos y rutinas físicas.",
      },
    ],
  }),
  component: DesarrolloPage,
});

type SubView = "resumen" | "retro" | "objetivos" | "evaluaciones" | "rutinas";

function DesarrolloPage() {
  const { profile, user, teamOptions, isSuperAdmin, accessibleModules } = useApp();
  const clubId = profile?.club_id ?? null;
  const canAccess = isSuperAdmin || accessibleModules.includes("desarrollo");
  const { canEditTeam, canReadTeam, onlyOwnRows } = useTeamAccess("desarrollo");
  // 'vista_jugador' en un módulo personal: solo se ven los registros propios.
  const seesOwnOnly = React.useCallback(
    (teamId: string, playerUserId: string) => !onlyOwnRows(teamId) || playerUserId === user.id,
    [onlyOwnRows, user.id],
  );
  const editableTeams = useEditableTeams("desarrollo");

  const [view, setView] = React.useState<SubView>("resumen");
  const [teamFilter, setTeamFilter] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");

  const [feedbackOpen, setFeedbackOpen] = React.useState(false);
  const [editingFeedback, setEditingFeedback] = React.useState<FeedbackRow | null>(null);
  const [goalOpen, setGoalOpen] = React.useState(false);
  const [editingGoal, setEditingGoal] = React.useState<GoalRow | null>(null);
  const [assessOpen, setAssessOpen] = React.useState(false);
  const [editingAssessment, setEditingAssessment] = React.useState<AssessmentRow | null>(null);
  const [routineOpen, setRoutineOpen] = React.useState(false);
  const [editingRoutine, setEditingRoutine] = React.useState<RoutineRow | null>(null);
  const [assignRoutine, setAssignRoutine] = React.useState<RoutineRow | null>(null);
  const [detailPlayer, setDetailPlayer] = React.useState<DevelopmentRosterMember | null>(null);
  const [detailFeedback, setDetailFeedback] = React.useState<FeedbackRow | null>(null);
  const [detailGoal, setDetailGoal] = React.useState<GoalRow | null>(null);
  const [detailAssessment, setDetailAssessment] = React.useState<AssessmentRow | null>(null);
  const [detailRoutine, setDetailRoutine] = React.useState<RoutineRow | null>(null);
  const [selfOpen, setSelfOpen] = React.useState(false);

  const rosterQ = useDevelopmentRoster(canAccess ? clubId : null);
  const feedbackQ = useFeedback(canAccess ? clubId : null);
  const goalsQ = useGoals(canAccess ? clubId : null);
  const assessmentsQ = useAssessments(canAccess ? clubId : null);
  const routinesQ = useRoutines(canAccess ? clubId : null);

  const roster = React.useMemo(
    () => (rosterQ.data ?? []).filter((p) => canReadTeam(p.teamId) && seesOwnOnly(p.teamId, p.userId)),
    [rosterQ.data, canReadTeam, seesOwnOnly],
  );
  const editablePlayers = React.useMemo(
    () => roster.filter((p) => canEditTeam(p.teamId)),
    [roster, canEditTeam],
  );
  const canEditAny = editablePlayers.length > 0 || editableTeams.length > 0;

  const matchTeam = (teamId: string) => !teamFilter || teamFilter === teamId;
  const q = search.trim().toLowerCase();
  const byName = (name: string | null | undefined) => !q || (name ?? "").toLowerCase().includes(q);

  const filteredRoster = roster.filter((p) => matchTeam(p.teamId) && byName(p.fullName));
  const feedback = (feedbackQ.data ?? []).filter(
    (f) => matchTeam(f.team_id) && byName(f.player?.full_name),
  );
  const goals = (goalsQ.data ?? []).filter((g) => matchTeam(g.team_id) && byName(g.player?.full_name));
  const assessments = (assessmentsQ.data ?? []).filter(
    (a) => matchTeam(a.team_id) && byName(a.player?.full_name),
  );
  const routines = (routinesQ.data ?? []).filter((r) => matchTeam(r.team_id) && (!q || byName(r.name)));

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

  const primaryAction = () => {
    if (view === "retro") {
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
    }
  };

  const actionLabel: Record<SubView, string> = {
    resumen: "",
    retro: "Registrar retroalimentación",
    objetivos: "Nuevo objetivo",
    evaluaciones: "Nueva evaluación",
    rutinas: "Nueva rutina",
  };

  return (
    <div className="space-y-6">
      <ModuleTabs activeKey="desarrollo" />
      <PageHeader hideTitle title="Desarrollo" subtitle="Evaluaciones y progresos" />
      <TeamFilter teams={teamOptions} value={teamFilter} onChange={setTeamFilter} />

      <Button variant="outline" className="w-full" onClick={() => setSelfOpen(true)}>
        <UserCheck className="mr-2 h-4 w-4" /> Mi desarrollo
      </Button>

      <Tabs value={view} onValueChange={(v) => setView(v as SubView)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="retro">Retro</TabsTrigger>
          <TabsTrigger value="objetivos">Objetivos</TabsTrigger>
          <TabsTrigger value="evaluaciones">Evaluar</TabsTrigger>
          <TabsTrigger value="rutinas">Rutinas</TabsTrigger>
        </TabsList>

        {canEditAny && view !== "resumen" ? (
          <Button className="w-full glow-primary" onClick={primaryAction}>
            <Plus className="mr-2 h-4 w-4" /> {actionLabel[view]}
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

        <TabsContent value="resumen" className="space-y-3">
          {rosterQ.isLoading ? (
            <CardGridSkeleton count={4} />
          ) : filteredRoster.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="Sin jugadores visibles"
              message="Solo ves el desarrollo de los equipos donde tienes acceso. Abre “Mi desarrollo” para ver lo tuyo."
            />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredRoster.map((p) => {
                const last = assessments
                  .filter((a) => a.player_user_id === p.userId)
                  .slice()
                  .sort((a, b) => b.assessment_date.localeCompare(a.assessment_date))[0];
                const avg = averageScore(last);
                const active = goals.filter(
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
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display font-semibold text-foreground">
                        {p.fullName ?? "—"}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.teamName ?? "—"}
                        {p.position ? ` · ${p.position}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {avg != null ? `Promedio ${avg}/10` : "Sin evaluaciones"} · {active} objetivo(s)
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="retro" className="space-y-3">
          {feedbackQ.isLoading ? (
            <CardGridSkeleton count={3} />
          ) : feedback.length === 0 ? (
            <EmptyState
              icon={MessageSquareQuote}
              title="Sin retroalimentación"
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
                  action={<TeamBadge name={f.team?.name} />}
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

        <TabsContent value="objetivos" className="space-y-3">
          {goalsQ.isLoading ? (
            <CardGridSkeleton count={3} />
          ) : goals.length === 0 ? (
            <EmptyState icon={Target} title="Sin objetivos" message="Aún no hay objetivos definidos." />
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

        <TabsContent value="evaluaciones" className="space-y-3">
          {assessmentsQ.isLoading ? (
            <CardGridSkeleton count={3} />
          ) : assessments.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="Sin evaluaciones"
              message="Registra la primera evaluación por atributos para ver la evolución."
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

        <TabsContent value="rutinas" className="space-y-3">
          {routinesQ.isLoading ? (
            <CardGridSkeleton count={3} />
          ) : routines.length === 0 ? (
            <EmptyState icon={Dumbbell} title="Sin rutinas" message="Crea la primera rutina física." />
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
              }
            : null
        }
        isSelf={detailPlayer?.userId === user.id}
      />

      <PlayerDevelopmentSheet
        open={selfOpen}
        onOpenChange={setSelfOpen}
        clubId={clubId}
        player={{
          userId: user.id,
          fullName: profile?.full_name ?? "Mi desarrollo",
          avatarUrl: null,
          teamName: null,
        }}
        isSelf
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
