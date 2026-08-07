import * as React from "react";
import { toast } from "sonner";
import { Dumbbell, Target, TrendingUp, MessageSquareQuote } from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { StatusBadge, type StatusVariant } from "@/components/squad/StatusBadge";
import {
  ASSIGNMENT_STATUS_LABEL,
  GOAL_STATUS_LABEL,
  daysUntil,
  formatDay,
  useSetAssignmentStatus,
  usePlayerDevelopment,
  type AssignmentStatus,
  type GoalStatus,
} from "@/hooks/useDevelopment";
import { AssessmentChart } from "./AssessmentChart";

export const GOAL_STATUS_VARIANT: Record<GoalStatus, StatusVariant> = {
  pendiente: "pending",
  en_progreso: "info",
  cumplido: "approved",
  no_cumplido: "rejected",
};

export const ASSIGNMENT_STATUS_VARIANT: Record<AssignmentStatus, StatusVariant> = {
  asignada: "pending",
  en_progreso: "info",
  completada: "approved",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string | null;
  player: {
    userId: string;
    fullName: string | null;
    avatarUrl: string | null;
    teamName?: string | null;
  } | null;
  /** El propio jugador puede mover el estado de SUS rutinas. */
  isSelf?: boolean;
}

/** Panorama de desarrollo de un jugador (cuerpo técnico con acceso, o él mismo). */
export function PlayerDevelopmentSheet({ open, onOpenChange, clubId, player, isSelf }: Props) {
  const q = usePlayerDevelopment(open && player ? player.userId : null);
  const setStatus = useSetAssignmentStatus(clubId);

  if (!player) return null;
  const data = q.data;
  const goals = data?.goals ?? [];

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
      <EntitySheetHeader>
        <EntitySheetTitle>{player.fullName ?? "Jugador"}</EntitySheetTitle>
        <EntitySheetDescription>
          Desarrollo{player.teamName ? ` · ${player.teamName}` : ""}
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="flex items-center gap-3">
          <Avatar className="h-14 w-14">
            <AvatarImage src={player.avatarUrl ?? undefined} alt="" />
            <AvatarFallback>{(player.fullName ?? "?").slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <p className="text-sm text-muted-foreground">
            Esta información solo la ven el cuerpo técnico del equipo y el propio jugador.
          </p>
        </div>

        <Section icon={TrendingUp} title="Evaluaciones">
          <AssessmentChart assessments={data?.assessments ?? []} />
        </Section>

        <Section icon={Target} title="Objetivos">
          {goals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin objetivos registrados.</p>
          ) : (
            <ul className="space-y-2">
              {goals.map((g) => {
                const d = daysUntil(g.target_date);
                const overdue =
                  d != null && d < 0 && (g.status === "pendiente" || g.status === "en_progreso");
                return (
                  <li key={g.id} className="glass space-y-1 p-3 text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-foreground">{g.title}</p>
                      <StatusBadge variant={GOAL_STATUS_VARIANT[g.status]}>
                        {GOAL_STATUS_LABEL[g.status]}
                      </StatusBadge>
                    </div>
                    {g.description ? <p className="text-muted-foreground">{g.description}</p> : null}
                    {g.target_date ? (
                      <p className={overdue ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                        Meta: {formatDay(g.target_date)}
                      </p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section icon={MessageSquareQuote} title="Retroalimentación">
          {(data?.feedback ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin retroalimentación registrada.</p>
          ) : (
            <ul className="space-y-2">
              {(data?.feedback ?? []).map((f) => (
                <li key={f.id} className="glass space-y-1 p-3 text-sm">
                  <p className="text-xs text-muted-foreground">
                    {formatDay(f.feedback_date)}
                    {f.context ? ` · ${f.context}` : ""}
                  </p>
                  <p className="whitespace-pre-wrap text-foreground">{f.content}</p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section icon={Dumbbell} title="Rutinas asignadas">
          {(data?.assignments ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin rutinas asignadas.</p>
          ) : (
            <ul className="space-y-2">
              {(data?.assignments ?? []).map((a) => (
                <li key={a.id} className="glass space-y-2 p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-foreground">{a.routine?.name ?? "Rutina"}</p>
                    <StatusBadge variant={ASSIGNMENT_STATUS_VARIANT[a.status]}>
                      {ASSIGNMENT_STATUS_LABEL[a.status]}
                    </StatusBadge>
                  </div>
                  {a.due_date ? (
                    <p className="text-xs text-muted-foreground">Entrega: {formatDay(a.due_date)}</p>
                  ) : null}
                  {(a.routine?.exercises ?? []).length > 0 ? (
                    <ol className="space-y-1 text-xs text-muted-foreground">
                      {(a.routine?.exercises ?? []).map((e) => (
                        <li key={e.id}>
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
                </li>
              ))}
            </ul>
          )}
        </Section>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cerrar
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="mr-1 inline h-4 w-4" /> {title}
      </h3>
      {children}
    </section>
  );
}
