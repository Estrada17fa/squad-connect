import * as React from "react";
import { CalendarDays, TrendingUp, User } from "lucide-react";
import { DetailField, DetailSection, DetailSheet, DetailValue } from "@/components/squad/DetailSheet";
import { TeamBadge } from "@/components/squad/TeamFilter";
import {
  averageScore,
  formatDay,
  type AssessmentRow,
  type DevelopmentRosterMember,
} from "@/hooks/useDevelopment";
import { AssessmentChart } from "./AssessmentChart";
import { AssessmentFormDialog } from "./AssessmentFormDialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  assessment: AssessmentRow | null;
  canEdit: boolean;
  clubId: string | null;
  userId: string;
  players: DevelopmentRosterMember[];
}

/** Ficha de lectura de una evaluación por atributos, con edición opcional. */
export function AssessmentDetailSheet({ open, onOpenChange, assessment, canEdit, clubId, userId, players }: Props) {
  if (!assessment) return null;

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={assessment.player?.full_name ?? "Jugador"}
      icon={TrendingUp}
      description={formatDay(assessment.assessment_date)}
      canEdit={canEdit && !!clubId}
      renderEdit={
        clubId
          ? ({ done }) => (
              <AssessmentFormDialog
                open
                onOpenChange={(v) => {
                  if (!v) done();
                }}
                clubId={clubId}
                userId={userId}
                players={players}
                assessment={assessment}
              />
            )
          : undefined
      }
    >
      <DetailSection title="Detalle">
        <DetailField label="Jugador" icon={User}>
          <DetailValue value={assessment.player?.full_name} />
        </DetailField>
        <DetailField label="Fecha" icon={CalendarDays}>
          {formatDay(assessment.assessment_date)}
        </DetailField>
        <DetailField label="Equipo">
          <TeamBadge name={assessment.team?.name} />
        </DetailField>
        <DetailField label="Promedio" icon={TrendingUp}>
          {averageScore(assessment) ?? "—"}/10
        </DetailField>
        {assessment.notes ? (
          <DetailField label="Notas">
            <DetailValue value={assessment.notes} />
          </DetailField>
        ) : null}
      </DetailSection>

      <DetailSection title="Atributos">
        <AssessmentChart assessments={[assessment]} />
      </DetailSection>
    </DetailSheet>
  );
}
