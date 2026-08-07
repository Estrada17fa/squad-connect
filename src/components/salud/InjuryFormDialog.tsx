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
  INJURY_STATUS_LABEL,
  SEVERITY_LABEL,
  useSaveInjury,
  type InjuryRow,
  type InjurySeverity,
  type InjuryStatus,
  type MedicalRosterMember,
} from "@/hooks/useHealth";
import type { AvailabilityStatus } from "@/hooks/usePlayers";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  players: MedicalRosterMember[];
  injury?: InjuryRow | null;
  presetPlayerUserId?: string | null;
}

const AVAILABILITY_OPTIONS: { value: AvailabilityStatus | ""; label: string }[] = [
  { value: "", label: "No cambiar" },
  { value: "apto", label: "Apto" },
  { value: "en_duda", label: "En duda" },
  { value: "lesionado", label: "Lesionado" },
];

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function InjuryFormDialog({
  open,
  onOpenChange,
  clubId,
  userId,
  players,
  injury,
  presetPlayerUserId,
}: Props) {
  const save = useSaveInjury(clubId, userId);
  const isEdit = !!injury;

  const [playerUserId, setPlayerUserId] = React.useState("");
  const [type, setType] = React.useState("");
  const [bodyPart, setBodyPart] = React.useState("");
  const [severity, setSeverity] = React.useState<InjurySeverity>("leve");
  const [occurredAt, setOccurredAt] = React.useState(todayISO());
  const [estimatedReturn, setEstimatedReturn] = React.useState("");
  const [status, setStatus] = React.useState<InjuryStatus>("activa");
  const [description, setDescription] = React.useState("");
  const [availability, setAvailability] = React.useState<AvailabilityStatus | "">("");

  React.useEffect(() => {
    if (!open) return;
    setPlayerUserId(injury?.player_user_id ?? presetPlayerUserId ?? players[0]?.userId ?? "");
    setType(injury?.injury_type ?? "");
    setBodyPart(injury?.body_part ?? "");
    setSeverity(injury?.severity ?? "leve");
    setOccurredAt(injury?.occurred_at ?? todayISO());
    setEstimatedReturn(injury?.estimated_return ?? "");
    setStatus(injury?.status ?? "activa");
    setDescription(injury?.description ?? "");
    setAvailability(injury ? "" : "lesionado");
  }, [open, injury, presetPlayerUserId, players]);

  const player = players.find((p) => p.userId === playerUserId) ?? null;
  const disabled = !player || !type.trim() || !bodyPart.trim() || save.isPending;

  const submit = async () => {
    if (!player) {
      toast.error("Elige un jugador");
      return;
    }
    try {
      await save.mutateAsync({
        id: injury?.id ?? null,
        team_id: player.teamId,
        player_user_id: player.userId,
        injury_type: type.trim(),
        body_part: bodyPart.trim(),
        severity,
        occurred_at: occurredAt || todayISO(),
        estimated_return: estimatedReturn || null,
        status,
        description: description.trim() || null,
        availability: availability || null,
      });
      toast.success(isEdit ? "Lesión actualizada" : "Lesión registrada");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar la lesión");
    }
  };

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar lesión" : "Registrar lesión"}</EntitySheetTitle>
        <EntitySheetDescription>
          Al registrarla puedes actualizar la disponibilidad, que se refleja en Plantel.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-1.5">
          <Label htmlFor="inj-player">Jugador</Label>
          <select
            id="inj-player"
            value={playerUserId}
            onChange={(e) => setPlayerUserId(e.target.value)}
            disabled={isEdit}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60"
          >
            <option value="">Selecciona…</option>
            {players.map((p) => (
              <option key={p.playerId} value={p.userId}>
                {p.fullName ?? "Sin nombre"}
                {p.teamName ? ` · ${p.teamName}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="inj-type">Tipo de lesión</Label>
            <Input id="inj-type" value={type} onChange={(e) => setType(e.target.value)} placeholder="Esguince" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inj-part">Zona del cuerpo</Label>
            <Input
              id="inj-part"
              value={bodyPart}
              onChange={(e) => setBodyPart(e.target.value)}
              placeholder="Tobillo izquierdo"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="inj-sev">Gravedad</Label>
            <select
              id="inj-sev"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as InjurySeverity)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {(Object.keys(SEVERITY_LABEL) as InjurySeverity[]).map((s) => (
                <option key={s} value={s}>
                  {SEVERITY_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inj-status">Estado</Label>
            <select
              id="inj-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as InjuryStatus)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {(Object.keys(INJURY_STATUS_LABEL) as InjuryStatus[]).map((s) => (
                <option key={s} value={s}>
                  {INJURY_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="inj-date">Fecha de la lesión</Label>
            <Input
              id="inj-date"
              type="date"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inj-return">Retorno estimado</Label>
            <Input
              id="inj-return"
              type="date"
              value={estimatedReturn}
              onChange={(e) => setEstimatedReturn(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="inj-desc">Descripción</Label>
          <Textarea
            id="inj-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="inj-avail">Disponibilidad del jugador</Label>
          <select
            id="inj-avail"
            value={availability}
            onChange={(e) => setAvailability(e.target.value as AvailabilityStatus | "")}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {AVAILABILITY_OPTIONS.map((o) => (
              <option key={o.value || "none"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Solo el estado se comparte en Plantel; el diagnóstico nunca sale de Salud.
          </p>
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" className="glow-primary" onClick={submit} disabled={disabled}>
          {save.isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Registrar lesión"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
