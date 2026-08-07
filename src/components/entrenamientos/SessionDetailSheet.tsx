import * as React from "react";
import { Pencil } from "lucide-react";
import { DetailSection, DetailSheet } from "@/components/squad/DetailSheet";
import { Button } from "@/components/ui/button";
import { AttendeeSummary } from "@/components/calendar/AttendeeSummary";
import { SessionPlanContent } from "@/components/entrenamientos/SessionPlanContent";
import { formatSessionDate, type TrainingSessionRow } from "@/hooks/useTraining";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  session: TrainingSessionRow | null;
  /** Modo consulta: sin acciones de edición. */
  readOnly?: boolean;
  onEdit?: () => void;
}

/** Ficha de lectura de una sesión de entrenamiento. Editar es una acción explícita en la cabecera. */
export function SessionDetailSheet({ open, onOpenChange, session, readOnly, onEdit }: Props) {
  const canEdit = !readOnly && !!onEdit;

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
      {session?.event_id ? (
        <DetailSection title="Convocatoria">
          <AttendeeSummary eventId={session.event_id} clubId={session.club_id} teamId={session.team_id} />
        </DetailSection>
      ) : null}

      <SessionPlanContent session={session} enabled={open} readOnly={readOnly} />
    </DetailSheet>
  );
}
