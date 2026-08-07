import * as React from "react";
import { Clock, Package, Target } from "lucide-react";
import { DetailField, DetailSection, DetailSheet, DetailValue } from "@/components/squad/DetailSheet";
import { useExerciseMediaUrl, CATEGORY_LABEL, type ExerciseRow } from "@/hooks/useTraining";
import type { TeamOption } from "@/hooks/useAccess";
import { ExerciseFormDialog } from "./ExerciseFormDialog";

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

function ExerciseMedia({ path }: { path: string }) {
  const { data: url } = useExerciseMediaUrl(path);
  if (!url) return null;
  const isVideo = /\.(mp4|mov|webm|m4v)$/i.test(path);
  return isVideo ? (
    <video src={url} controls className="mt-2 w-full rounded-lg" />
  ) : (
    <img src={url} alt="" className="mt-2 w-full rounded-lg object-cover" loading="lazy" />
  );
}

/** Ficha de lectura de un ejercicio de la biblioteca, con edición opcional. */
export function ExerciseDetailSheet({ open, onOpenChange, exercise, canEdit, clubId, userId, teams, teamName }: Props) {
  if (!exercise) return null;

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
      <DetailSection title="Detalle">
        <DetailField label="Categoría">{CATEGORY_LABEL[exercise.category]}</DetailField>
        <DetailField label="Equipo">
          {exercise.team_id ? teamName?.(exercise.team_id) ?? "Equipo" : "Club"}
        </DetailField>
        {exercise.duration_minutes ? (
          <DetailField label="Duración" icon={Clock}>
            {exercise.duration_minutes} min
          </DetailField>
        ) : null}
        {exercise.objective ? (
          <DetailField label="Objetivo" icon={Target}>
            <DetailValue value={exercise.objective} />
          </DetailField>
        ) : null}
        {exercise.materials ? (
          <DetailField label="Materiales" icon={Package}>
            <DetailValue value={exercise.materials} />
          </DetailField>
        ) : null}
        {exercise.description ? (
          <DetailField label="Descripción">
            <DetailValue value={exercise.description} />
          </DetailField>
        ) : null}
        {exercise.media_path ? (
          <DetailField label="Media">
            <ExerciseMedia path={exercise.media_path} />
          </DetailField>
        ) : null}
      </DetailSection>
    </DetailSheet>
  );
}
