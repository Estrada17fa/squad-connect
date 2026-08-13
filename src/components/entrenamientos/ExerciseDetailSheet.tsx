import * as React from "react";
import { Clock, Layers, Package, Repeat, Shield, Target } from "lucide-react";
import { DetailField, DetailSection, DetailSheet, DetailValue } from "@/components/squad/DetailSheet";
import { CATEGORY_LABEL, type ExerciseRow } from "@/hooks/useTraining";
import type { TeamOption } from "@/hooks/useAccess";
import { ExerciseFormDialog } from "./ExerciseFormDialog";
import { CATEGORY_ICON, ExerciseMedia, TrainingChip } from "./TrainingPieces";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  exercise: ExerciseRow | null;
  canEdit: boolean;
  clubId: string | null;
  userId: string;
  teams: TeamOption[];
  teamName?: (id: string | null) => string | null;
}

/** Ficha de lectura de un ejercicio de la biblioteca, con edición opcional. */
export function ExerciseDetailSheet({
  open,
  onOpenChange,
  exercise,
  canEdit,
  clubId,
  userId,
  teams,
  teamName,
}: Props) {
  if (!exercise) return null;

  const Icon = CATEGORY_ICON[exercise.category];
  const scope = exercise.team_id ? teamName?.(exercise.team_id) ?? "Categoría" : "Todo el club";

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={exercise.name}
      description={CATEGORY_LABEL[exercise.category]}
      canEdit={canEdit && !!clubId}
      renderEdit={
        clubId
          ? ({ done }) => (
              <ExerciseFormDialog
                open
                onOpenChange={(v) => {
                  if (!v) done();
                }}
                clubId={clubId}
                userId={userId}
                teams={teams}
                exercise={exercise}
              />
            )
          : undefined
      }
    >
      {exercise.media_path ? <ExerciseMedia path={exercise.media_path} /> : null}

      <div className="flex flex-wrap gap-1.5">
        <TrainingChip icon={Icon} tone="primary">
          {CATEGORY_LABEL[exercise.category]}
        </TrainingChip>
        <TrainingChip icon={Shield}>{scope}</TrainingChip>
        {exercise.duration_minutes ? (
          <TrainingChip icon={Clock}>{exercise.duration_minutes} min</TrainingChip>
        ) : null}
        {exercise.default_sets ? (
          <TrainingChip icon={Layers}>{exercise.default_sets} series</TrainingChip>
        ) : null}
        {exercise.default_reps ? (
          <TrainingChip icon={Repeat}>{exercise.default_reps} reps</TrainingChip>
        ) : null}
      </div>

      {exercise.objective || exercise.description ? (
        <DetailSection title="Cómo se trabaja">
          {exercise.objective ? (
            <DetailField label="Objetivo" icon={Target}>
              <DetailValue value={exercise.objective} />
            </DetailField>
          ) : null}
          {exercise.description ? (
            <DetailField label="Descripción">
              <DetailValue value={exercise.description} />
            </DetailField>
          ) : null}
        </DetailSection>
      ) : null}

      <DetailSection title="Detalle">
        <DetailField label="Alcance" icon={Shield}>
          {scope}
        </DetailField>
        {exercise.duration_minutes ? (
          <DetailField label="Duración" icon={Clock}>
            {exercise.duration_minutes} min
          </DetailField>
        ) : null}
        {exercise.default_sets || exercise.default_reps ? (
          <DetailField label="Carga sugerida" icon={Layers}>
            {[
              exercise.default_sets ? `${exercise.default_sets} series` : null,
              exercise.default_reps ? `${exercise.default_reps} reps` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </DetailField>
        ) : null}
        {exercise.materials ? (
          <DetailField label="Material necesario" icon={Package}>
            <DetailValue value={exercise.materials} />
          </DetailField>
        ) : null}
      </DetailSection>
    </DetailSheet>
  );
}
