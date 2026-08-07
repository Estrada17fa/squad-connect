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
import {
  GOAL_STATUS_LABEL,
  useSaveGoal,
  type DevelopmentRosterMember,
  type GoalRow,
  type GoalStatus,
} from "@/hooks/useDevelopment";
import { PlayerSelect } from "./PlayerSelect";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  players: DevelopmentRosterMember[];
  goal?: GoalRow | null;
  defaultPlayerUserId?: string | null;
}

const STATUSES: GoalStatus[] = ["pendiente", "en_progreso", "cumplido", "no_cumplido"];

export function GoalFormDialog({
  open,
  onOpenChange,
  clubId,
  userId,
  players,
  goal,
  defaultPlayerUserId,
}: Props) {
  const isEdit = !!goal;
  const save = useSaveGoal(clubId, userId);

  const [playerUserId, setPlayerUserId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [targetDate, setTargetDate] = React.useState("");
  const [status, setStatus] = React.useState<GoalStatus>("pendiente");

  React.useEffect(() => {
    if (!open) return;
    setPlayerUserId(goal?.player_user_id ?? defaultPlayerUserId ?? "");
    setTitle(goal?.title ?? "");
    setDescription(goal?.description ?? "");
    setTargetDate(goal?.target_date ?? "");
    setStatus(goal?.status ?? "pendiente");
  }, [open, goal, defaultPlayerUserId]);

  const player = players.find((p) => p.userId === playerUserId);
  const disabled = !player || !title.trim() || save.isPending;

  const submit = () => {
    if (!player) return;
    save.mutate(
      {
        id: goal?.id ?? null,
        team_id: player.teamId,
        player_user_id: player.userId,
        title: title.trim(),
        description: description.trim() || null,
        target_date: targetDate || null,
        status,
      },
      {
        onSuccess: () => {
          toast.success(isEdit ? "Objetivo actualizado" : "Objetivo creado");
          onOpenChange(false);
        },
        onError: (e: any) => toast.error(e?.message ?? "No se pudo guardar"),
      },
    );
  };

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar objetivo" : "Nuevo objetivo"}</EntitySheetTitle>
        <EntitySheetDescription>Metas de desarrollo individuales del jugador.</EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <PlayerSelect
          id="goal-player"
          players={players}
          value={playerUserId}
          onChange={setPlayerUserId}
          disabled={isEdit}
        />

        <div className="space-y-1.5">
          <Label htmlFor="goal-title">Objetivo</Label>
          <Input
            id="goal-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="p.ej. Mejorar el perfil izquierdo"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="goal-desc">Descripción (opcional)</Label>
          <Textarea
            id="goal-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="goal-date">Fecha meta</Label>
            <Input
              id="goal-date"
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="goal-status">Estado</Label>
            <select
              id="goal-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as GoalStatus)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {GOAL_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" className="glow-primary" onClick={submit} disabled={disabled}>
          {save.isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear objetivo"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
