import * as React from "react";
import { CalendarDays, Target, User } from "lucide-react";
import { DetailField, DetailSection, DetailSheet, DetailValue } from "@/components/squad/DetailSheet";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { TeamBadge } from "@/components/squad/TeamFilter";
import {
  GOAL_STATUS_LABEL,
  daysUntil,
  formatDay,
  type DevelopmentRosterMember,
  type GoalRow,
} from "@/hooks/useDevelopment";
import { GOAL_STATUS_VARIANT } from "./PlayerDevelopmentSheet";
import { GoalFormDialog } from "./GoalFormDialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  goal: GoalRow | null;
  canEdit: boolean;
  clubId: string | null;
  userId: string;
  players: DevelopmentRosterMember[];
}

/** Ficha de lectura de un objetivo de desarrollo, con edición opcional. */
export function GoalDetailSheet({ open, onOpenChange, goal, canEdit, clubId, userId, players }: Props) {
  if (!goal) return null;
  const d = daysUntil(goal.target_date);
  const overdue = d != null && d < 0 && (goal.status === "pendiente" || goal.status === "en_progreso");

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={goal.title}
      icon={Target}
      description={goal.player?.full_name ?? "Jugador"}
      canEdit={canEdit && !!clubId}
      headerActions={
        <StatusBadge variant={GOAL_STATUS_VARIANT[goal.status]}>{GOAL_STATUS_LABEL[goal.status]}</StatusBadge>
      }
      renderEdit={
        clubId
          ? ({ done }) => (
              <GoalFormDialog
                open
                onOpenChange={(v) => {
                  if (!v) done();
                }}
                clubId={clubId}
                userId={userId}
                players={players}
                goal={goal}
              />
            )
          : undefined
      }
    >
      <DetailSection title="Detalle">
        <DetailField label="Jugador" icon={User}>
          <DetailValue value={goal.player?.full_name} />
        </DetailField>
        <DetailField label="Equipo">
          <TeamBadge name={goal.team?.name} />
        </DetailField>
        {goal.description ? (
          <DetailField label="Descripción">
            <DetailValue value={goal.description} />
          </DetailField>
        ) : null}
        {goal.target_date ? (
          <DetailField label="Fecha meta" icon={CalendarDays}>
            <span className={overdue ? "text-destructive" : undefined}>
              {formatDay(goal.target_date)}
              {d != null ? (overdue ? ` · vencido ${Math.abs(d)} d` : ` · en ${d} d`) : ""}
            </span>
          </DetailField>
        ) : null}
        <DetailField label="Estado" icon={Target}>
          {GOAL_STATUS_LABEL[goal.status]}
        </DetailField>
      </DetailSection>
    </DetailSheet>
  );
}
