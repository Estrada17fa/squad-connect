import * as React from "react";
import { CalendarDays, MessageSquareQuote, User } from "lucide-react";
import { DetailField, DetailSection, DetailSheet, DetailValue } from "@/components/squad/DetailSheet";
import { TeamBadge } from "@/components/squad/TeamFilter";
import {
  formatDay,
  type DevelopmentRosterMember,
  type FeedbackRow,
} from "@/hooks/useDevelopment";
import { FeedbackFormDialog } from "./FeedbackFormDialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  feedback: FeedbackRow | null;
  canEdit: boolean;
  clubId: string | null;
  userId: string;
  players: DevelopmentRosterMember[];
}

/** Ficha de lectura de una retroalimentación, con edición opcional. */
export function FeedbackDetailSheet({ open, onOpenChange, feedback, canEdit, clubId, userId, players }: Props) {
  if (!feedback) return null;

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={feedback.player?.full_name ?? "Jugador"}
      description={feedback.context ?? formatDay(feedback.feedback_date)}
      canEdit={canEdit && !!clubId}
      renderEdit={
        clubId
          ? ({ done }) => (
              <FeedbackFormDialogInline
                open
                onOpenChange={(v) => !v && done()}
                clubId={clubId}
                userId={userId}
                players={players}
                feedback={feedback}
                onSaved={done}
              />
            )
          : undefined
      }
    >
      <DetailSection title="Detalle">
        <DetailField label="Jugador" icon={User}>
          <DetailValue value={feedback.player?.full_name} />
        </DetailField>
        <DetailField label="Fecha" icon={CalendarDays}>
          {formatDay(feedback.feedback_date)}
        </DetailField>
        {feedback.context ? (
          <DetailField label="Contexto">
            <DetailValue value={feedback.context} />
          </DetailField>
        ) : null}
        <DetailField label="Equipo">
          <TeamBadge name={feedback.team?.name} />
        </DetailField>
        <DetailField label="Visibilidad" icon={feedback.visible_to_player ? Eye : EyeOff}>
          {feedback.visible_to_player
            ? "Visible para el jugador"
            : "Nota interna · solo cuerpo técnico"}
        </DetailField>
        <DetailField label="Retroalimentación" icon={MessageSquareQuote}>
          <DetailValue value={feedback.content} />
        </DetailField>
      </DetailSection>
    </DetailSheet>
  );
}

/** Envoltura del formulario existente para usarlo dentro de DetailSheet.renderEdit. */
function FeedbackFormDialogInline(
  props: React.ComponentProps<typeof FeedbackFormDialog> & { onSaved: () => void },
) {
  const { onSaved, onOpenChange, ...rest } = props;
  return (
    <FeedbackFormDialog
      {...rest}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) onSaved();
      }}
    />
  );
}
