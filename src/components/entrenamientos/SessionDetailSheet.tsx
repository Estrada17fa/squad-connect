import * as React from "react";
import { CalendarDays, Pencil } from "lucide-react";
import { DetailSection, DetailSheet } from "@/components/squad/DetailSheet";
import { Button } from "@/components/ui/button";
import { AttendeeSummary } from "@/components/calendar/AttendeeSummary";
import { SessionPlanContent } from "@/components/entrenamientos/SessionPlanContent";
import { PlanSummaryChips, TrainingChip } from "@/components/entrenamientos/TrainingPieces";
import {
  PHASE_LABEL,
  formatSessionDate,
  useSessionPlan,
  itemMinutes,
  type TrainingSessionRow,
} from "@/hooks/useTraining";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  session: TrainingSessionRow | null;
  /** Modo consulta: sin acciones de edición. */
  readOnly?: boolean;
  onEdit?: () => void;
  teamName?: string | null;
}

/** Ficha de lectura de una sesión de entrenamiento. Editar es una acción explícita en la cabecera. */
export function SessionDetailSheet({ open, onOpenChange, session, readOnly, onEdit, teamName }: Props) {
  const canEdit = !readOnly && !!onEdit;
  const planQ = useSessionPlan(open && session ? session.id : null);
  const plan = planQ.data ?? [];
  const minutes = plan.reduce((s, i) => s + itemMinutes(i), 0);
  const phases = [...new Set(plan.map((p) => p.phase))];

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      size="xl"
      title={session?.title ?? "Sesión"}
      description={session ? formatSessionDate(session.session_date) : ""}
      headerActions={
        canEdit ? (
          <Button type="button" size="sm" variant="secondary" onClick={onEdit}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Editar sesión
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-wrap gap-1.5">
        {teamName ? <TrainingChip>{teamName}</TrainingChip> : null}
        {session?.event_id ? (
          <TrainingChip icon={CalendarDays} tone="primary">
            En el calendario
          </TrainingChip>
        ) : null}
      </div>

      {plan.length ? (
        <PlanSummaryChips
          count={plan.length}
          minutes={minutes}
          phases={phases}
          phaseLabels={PHASE_LABEL}
        />
      ) : null}

      {session?.event_id ? (
        <DetailSection title="Convocatoria">
          <AttendeeSummary eventId={session.event_id} clubId={session.club_id} teamId={session.team_id} />
        </DetailSection>
      ) : null}

      <SessionPlanContent
        session={session}
        enabled={open}
        readOnly={readOnly}
        onAddExercises={canEdit ? onEdit : undefined}
      />
    </DetailSheet>
  );
}
