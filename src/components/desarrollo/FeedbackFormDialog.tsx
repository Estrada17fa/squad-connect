import * as React from "react";
import { toast } from "sonner";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useSaveFeedback, type DevelopmentRosterMember, type FeedbackRow } from "@/hooks/useDevelopment";
import { PlayerSelect } from "./PlayerSelect";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  players: DevelopmentRosterMember[];
  feedback?: FeedbackRow | null;
  defaultPlayerUserId?: string | null;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function FeedbackFormDialog({
  open,
  onOpenChange,
  clubId,
  userId,
  players,
  feedback,
  defaultPlayerUserId,
}: Props) {
  const isEdit = !!feedback;
  const save = useSaveFeedback(clubId, userId);

  const [playerUserId, setPlayerUserId] = React.useState("");
  const [date, setDate] = React.useState(today());
  const [context, setContext] = React.useState("");
  const [content, setContent] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setPlayerUserId(feedback?.player_user_id ?? defaultPlayerUserId ?? "");
    setDate(feedback?.feedback_date ?? today());
    setContext(feedback?.context ?? "");
    setContent(feedback?.content ?? "");
  }, [open, feedback, defaultPlayerUserId]);

  const player = players.find((p) => p.userId === playerUserId);
  const disabled = !player || !content.trim() || save.isPending;

  const submit = () => {
    if (!player) return;
    save.mutate(
      {
        id: feedback?.id ?? null,
        team_id: player.teamId,
        player_user_id: player.userId,
        feedback_date: date,
        context: context.trim() || null,
        content: content.trim(),
      },
      {
        onSuccess: () => {
          toast.success(isEdit ? "Retroalimentación actualizada" : "Retroalimentación registrada");
          onOpenChange(false);
        },
        onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar"),
      },
    );
  };

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar retroalimentación" : "Nueva retroalimentación"}</EntitySheetTitle>
        <EntitySheetDescription>
          Solo la ven el cuerpo técnico del equipo y el propio jugador.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <PlayerSelect
          id="fb-player"
          players={players}
          value={playerUserId}
          onChange={setPlayerUserId}
          disabled={isEdit}
        />

        <div className="space-y-1.5">
          <Label htmlFor="fb-date">Fecha</Label>
          <Input id="fb-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fb-context">Contexto (opcional)</Label>
          <Input
            id="fb-context"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="p.ej. Jornada 5 vs Tigres · Entrenamiento"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="fb-content">Retroalimentación</Label>
          <Textarea
            id="fb-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
            placeholder="Qué hizo bien, qué debe mejorar y cómo trabajarlo."
          />
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" className="glow-primary" onClick={submit} disabled={disabled}>
          {save.isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Registrar"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
