import * as React from "react";
import { Dumbbell, Users } from "lucide-react";
import { DetailField, DetailSection, DetailSheet, DetailValue } from "@/components/squad/DetailSheet";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { TeamBadge } from "@/components/squad/TeamFilter";
import type { TeamOption } from "@/hooks/useAccess";
import {
  ASSIGNMENT_STATUS_LABEL,
  type DevelopmentRosterMember,
  type RoutineRow,
} from "@/hooks/useDevelopment";
import { ASSIGNMENT_STATUS_VARIANT } from "./PlayerDevelopmentSheet";
import { RoutineFormDialog } from "./RoutineFormDialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  routine: RoutineRow | null;
  canEdit: boolean;
  clubId: string | null;
  userId: string;
  teams: TeamOption[];
  onAssign?: (routine: RoutineRow) => void;
}

/** Ficha de lectura de una rutina física, con edición y asignación opcionales. */
export function RoutineDetailSheet({ open, onOpenChange, routine, canEdit, clubId, userId, teams, onAssign }: Props) {
  if (!routine) return null;

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={routine.name}
      description={routine.category ?? `${(routine.exercises ?? []).length} ejercicio(s)`}
      canEdit={canEdit && !!clubId}
      headerActions={
        canEdit ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onAssign?.(routine)}
          >
            <Users className="mr-2 h-3.5 w-3.5" /> Asignar a jugadores
          </Button>
        ) : undefined
      }
      renderEdit={
        clubId
          ? ({ done }) => (
              <RoutineFormDialog
                open
                onOpenChange={(v) => {
                  if (!v) done();
                }}
                clubId={clubId}
                userId={userId}
                teams={teams}
                routine={routine}
              />
            )
          : undefined
      }
    >
      <DetailSection title="Detalle">
        <DetailField label="Equipo">
          <TeamBadge name={routine.team?.name} />
        </DetailField>
        {routine.category ? (
          <DetailField label="Categoría">
            <DetailValue value={routine.category} />
          </DetailField>
        ) : null}
        {routine.description ? (
          <DetailField label="Descripción">
            <DetailValue value={routine.description} />
          </DetailField>
        ) : null}
      </DetailSection>

      <DetailSection title="Ejercicios">
        {(routine.exercises ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin ejercicios registrados.</p>
        ) : (
          <ol className="space-y-2">
            {(routine.exercises ?? []).map((e) => (
              <li key={e.id} className="glass space-y-1 p-3 text-sm">
                <p className="flex items-center gap-1.5 font-medium text-foreground">
                  <Dumbbell className="h-3.5 w-3.5 text-muted-foreground" /> {e.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {e.sets ? `${e.sets} series` : ""}
                  {e.reps ? ` × ${e.reps}` : ""}
                </p>
                {e.instructions ? <p className="text-muted-foreground">{e.instructions}</p> : null}
              </li>
            ))}
          </ol>
        )}
      </DetailSection>

      <DetailSection title="Asignaciones">
        {(routine.assignments ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin asignaciones.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {(routine.assignments ?? []).map((a) => (
              <StatusBadge key={a.id} variant={ASSIGNMENT_STATUS_VARIANT[a.status]}>
                {a.player?.full_name ?? "—"} · {ASSIGNMENT_STATUS_LABEL[a.status]}
              </StatusBadge>
            ))}
          </div>
        )}
      </DetailSection>
    </DetailSheet>
  );
}
