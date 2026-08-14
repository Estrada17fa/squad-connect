import * as React from "react";
import { toast } from "sonner";
import {
  Activity,
  BarChart3,
  CalendarDays,
  Dumbbell,
  EyeOff,
  MessageSquareQuote,
  Ruler,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/squad/StatusBadge";
import {
  ASSIGNMENT_STATUS_LABEL,
  GOAL_STATUS_LABEL,
  averageScore,
  daysUntil,
  formatDay,
  useSetAssignmentStatus,
  usePlayerDevelopment,
  type AssignmentStatus,
} from "@/hooks/useDevelopment";
import { ASSIGNMENT_STATUS_VARIANT, GOAL_STATUS_VARIANT, levelLabel } from "@/lib/desarrollo";
import { AssessmentChart } from "./AssessmentChart";
import { DevCard, DevEmpty, DevPersonHeader, DevSection, StatTile } from "./DevelopmentPieces";

/** Compatibilidad: las variantes viven en src/lib/desarrollo.ts. */
export { ASSIGNMENT_STATUS_VARIANT, GOAL_STATUS_VARIANT } from "@/lib/desarrollo";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string | null;
  player: {
    userId: string;
    fullName: string | null;
    avatarUrl: string | null;
    teamName?: string | null;
    position?: string | null;
    jerseyNumber?: number | null;
  } | null;
  /** El propio jugador puede mover el estado de SUS rutinas. */
  isSelf?: boolean;
}

export type DevelopmentPlayer = NonNullable<Props["player"]>;

/** Ficha completa de desarrollo de un jugador (cuerpo técnico o él mismo). */
export function PlayerDevelopmentContent({
  clubId,
  player,
  isSelf,
  enabled = true,
  showHeader = true,
}: {
  clubId: string | null;
  player: DevelopmentPlayer;
  isSelf?: boolean;
  enabled?: boolean;
  showHeader?: boolean;
}) {
  const q = usePlayerDevelopment(enabled ? player.userId : null);
  const tournamentStatsQ = usePlayerTournamentStats(enabled ? player.userId : null);
  const tournamentStats = tournamentStatsQ.data ?? [];
  const setStatus = useSetAssignmentStatus(clubId);

  const data = q.data;
  const assessments = data?.assessments ?? [];
  const goals = data?.goals ?? [];
  const feedback = data?.feedback ?? [];
  const assignments = data?.assignments ?? [];
  const measurements = data?.measurements ?? [];
  const stats = data?.stats ?? [];

  const last = assessments[assessments.length - 1] ?? null;
  const level = levelLabel(averageScore(last));
  const activeGoals = goals.filter((g) => g.status === "pendiente" || g.status === "en_progreso");
  const season = stats[0] ?? null;

  const subtitle = [player.teamName, player.position, player.jerseyNumber ? `#${player.jerseyNumber}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-6">
        {showHeader ? (
          <DevPersonHeader
            name={player.fullName ?? "Jugador"}
            avatarUrl={player.avatarUrl}
            subtitle={subtitle || undefined}
            badges={
              <>
                <StatusBadge variant={level.variant}>{level.label}</StatusBadge>
                {activeGoals.length > 0 ? (
                  <StatusBadge variant="info">
                    {activeGoals.length}{" "}
                    {activeGoals.length === 1 ? "objetivo activo" : "objetivos activos"}
                  </StatusBadge>
                ) : null}
              </>
            }
          />
        ) : null}

        <DevSection icon={TrendingUp} title="Evaluaciones">
          {assessments.length === 0 ? (
            <DevEmpty icon={TrendingUp} title="Sin evaluaciones" message="Aún no se ha calificado a este jugador." />
          ) : (
            <AssessmentChart assessments={assessments} />
          )}
        </DevSection>

        <DevSection icon={Target} title="Objetivos">
          {goals.length === 0 ? (
            <DevEmpty icon={Target} title="Sin objetivos" message="No hay metas registradas." />
          ) : (
            <div className="space-y-2">
              {goals.map((g) => {
                const d = daysUntil(g.target_date);
                const overdue =
                  d != null && d < 0 && (g.status === "pendiente" || g.status === "en_progreso");
                return (
                  <DevCard
                    key={g.id}
                    title={g.title}
                    badge={
                      <StatusBadge variant={GOAL_STATUS_VARIANT[g.status]}>
                        {GOAL_STATUS_LABEL[g.status]}
                      </StatusBadge>
                    }
                    meta={g.target_date ? `Meta: ${formatDay(g.target_date)}` : undefined}
                    metaIcon={CalendarDays}
                    metaTone={overdue ? "danger" : "muted"}
                    note={g.description ?? undefined}
                  />
                );
              })}
            </div>
          )}
        </DevSection>

        <DevSection icon={MessageSquareQuote} title="Retroalimentación">
          {feedback.length === 0 ? (
            <DevEmpty icon={MessageSquareQuote} title="Sin retroalimentación" />
          ) : (
            <div className="space-y-2">
              {feedback.map((f) => (
                <DevCard
                  key={f.id}
                  title={f.context ?? "Retroalimentación"}
                  badge={
                    !f.visible_to_player ? (
                      <StatusBadge variant="neutral">
                        <EyeOff className="mr-1 h-3 w-3" /> Interna
                      </StatusBadge>
                    ) : undefined
                  }
                  meta={formatDay(f.feedback_date)}
                  metaIcon={CalendarDays}
                  note={f.content}
                />
              ))}
            </div>
          )}
        </DevSection>

        <DevSection icon={Dumbbell} title="Rutinas asignadas">
          {assignments.length === 0 ? (
            <DevEmpty icon={Dumbbell} title="Sin rutinas" message="No hay planes individuales asignados." />
          ) : (
            <div className="space-y-2">
              {assignments.map((a) => (
                <DevCard
                  key={a.id}
                  title={a.routine?.name ?? "Rutina"}
                  badge={
                    <StatusBadge variant={ASSIGNMENT_STATUS_VARIANT[a.status]}>
                      {ASSIGNMENT_STATUS_LABEL[a.status]}
                    </StatusBadge>
                  }
                  meta={a.due_date ? `Entrega: ${formatDay(a.due_date)}` : undefined}
                  metaIcon={CalendarDays}
                >
                  {(a.routine?.exercises ?? []).length > 0 ? (
                    <ol className="space-y-1 text-xs text-muted-foreground">
                      {(a.routine?.exercises ?? []).map((e) => (
                        <li key={e.id} className="break-words [overflow-wrap:anywhere]">
                          • {e.name}
                          {e.sets ? ` · ${e.sets} series` : ""}
                          {e.reps ? ` × ${e.reps}` : ""}
                          {e.instructions ? ` — ${e.instructions}` : ""}
                        </li>
                      ))}
                    </ol>
                  ) : null}
                  {isSelf ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {(["asignada", "en_progreso", "completada"] as AssignmentStatus[]).map((s) => (
                        <Button
                          key={s}
                          type="button"
                          size="sm"
                          variant={a.status === s ? "secondary" : "outline"}
                          disabled={a.status === s || setStatus.isPending}
                          onClick={() =>
                            setStatus.mutate(
                              { id: a.id, status: s, player_user_id: player.userId },
                              {
                                onSuccess: () => toast.success("Rutina actualizada"),
                                onError: (e: any) => toast.error(e?.message ?? "No se pudo actualizar"),
                              },
                            )
                          }
                        >
                          {ASSIGNMENT_STATUS_LABEL[s]}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </DevCard>
              ))}
            </div>
          )}
        </DevSection>

        <DevSection icon={Ruler} title="Métricas físicas">
          {measurements.length === 0 ? (
            <DevEmpty icon={Ruler} title="Sin mediciones" message="Peso, estatura y pruebas físicas aparecerán aquí." />
          ) : (
            <div className="space-y-2">
              {measurements.map((m) => (
                <DevCard
                  key={m.id}
                  title={`${m.metric}: ${m.value}${m.unit ? ` ${m.unit}` : ""}`}
                  meta={formatDay(m.measured_on)}
                  metaIcon={CalendarDays}
                  note={m.notes ?? undefined}
                />
              ))}
            </div>
          )}
        </DevSection>

        <DevSection icon={Trophy} title="Estadísticas de torneo">
          {tournamentStats.length === 0 ? (
            <DevEmpty
              icon={Trophy}
              title="Sin registros de torneo"
              message="Se llenan solas con los goles capturados en el módulo Torneo."
            />
          ) : (
            <div className="space-y-3">
              {tournamentStats.map((t) => (
                <div key={t.tournament_id} className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    {[t.tournament_name, t.season_name].filter(Boolean).join(" · ")}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <StatTile value={t.goals} label="Goles" />
                    <StatTile value={t.matches_scored} label="Partidos con gol" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </DevSection>

        <DevSection icon={BarChart3} title="Estadísticas manuales (histórico)">
          {!season ? (
            <DevEmpty icon={Activity} title="Sin estadísticas" message="Aún no se capturan partidos ni minutos." />

          ) : (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">{season.season_name}</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                <StatTile value={season.matches_played} label="Partidos" />
                <StatTile value={season.matches_started} label="Titular" />
                <StatTile value={season.minutes_played} label="Minutos" />
                <StatTile value={season.goals} label="Goles" />
                <StatTile value={season.assists} label="Asist." />
                <StatTile value={season.yellow_cards} label="Amarillas" />
                <StatTile value={season.red_cards} label="Rojas" />
              </div>
              {stats.length > 1 ? (
                <div className="space-y-2">
                  {stats.slice(1).map((s) => (
                    <DevCard
                      key={s.id}
                      title={s.season_name}
                      meta={`${s.matches_played} PJ · ${s.minutes_played} min · ${s.goals} goles · ${s.assists} asist.`}
                      metaIcon={Activity}
                    />
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </DevSection>
    </div>
  );
}

/** Envoltura en sheet lateral para el cuerpo técnico. */
export function PlayerDevelopmentSheet({ open, onOpenChange, clubId, player, isSelf }: Props) {
  if (!player) return null;
  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
      <EntitySheetHeader>
        <EntitySheetTitle>{isSelf ? "Mi desarrollo" : (player.fullName ?? "Jugador")}</EntitySheetTitle>
        <EntitySheetDescription>Seguimiento deportivo del cuerpo técnico</EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <PlayerDevelopmentContent
          clubId={clubId}
          player={player}
          isSelf={isSelf}
          enabled={open}
          showHeader
        />
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cerrar
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
