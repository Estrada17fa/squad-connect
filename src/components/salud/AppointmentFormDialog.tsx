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
import { PlayerPicker } from "@/components/squad/PlayerPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fromLocalInputValue, toLocalInputValue } from "@/lib/calendar-utils";
import {
  useDeleteAppointment,
  useSaveAppointment,
  type AppointmentRow,
  type MedicalRosterMember,
} from "@/hooks/useHealth";
import {
  APPOINTMENT_STATUS_LABEL,
  CHECKUP_TYPE_LABEL,
  CHECKUP_TYPE_ORDER,
  type AppointmentStatus,
  type CheckupType,
} from "@/lib/salud";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  /** Jugadores de equipos donde el usuario puede editar Salud. */
  players: MedicalRosterMember[];
  appointment?: AppointmentRow | null;
  /** Jugador fijo (desde su ficha). */
  fixedPlayerUserId?: string | null;
}

export function AppointmentFormDialog({
  open,
  onOpenChange,
  clubId,
  userId,
  players,
  appointment,
  fixedPlayerUserId,
}: Props) {
  const save = useSaveAppointment(clubId, userId);
  const del = useDeleteAppointment(clubId);
  const isEdit = !!appointment;

  const [playerUserId, setPlayerUserId] = React.useState("");
  const [when, setWhen] = React.useState("");
  const [type, setType] = React.useState<CheckupType>("valoracion");
  const [reason, setReason] = React.useState("");
  const [place, setPlace] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [status, setStatus] = React.useState<AppointmentStatus>("programada");

  React.useEffect(() => {
    if (!open) return;
    setPlayerUserId(
      appointment?.player_user_id ?? fixedPlayerUserId ?? "",
    );
    setWhen(toLocalInputValue(appointment?.scheduled_at ?? new Date().toISOString()));
    setType((appointment?.appointment_type ?? "valoracion") as CheckupType);
    setReason(appointment?.reason ?? "");
    setPlace(appointment?.place ?? "");
    setNotes(appointment?.notes ?? "");
    setStatus((appointment?.status ?? "programada") as AppointmentStatus);
  }, [open, appointment, fixedPlayerUserId, players]);

  const player = players.find((p) => p.userId === playerUserId) ?? null;

  const submit = async () => {
    if (!player) {
      toast.error("Elige un jugador");
      return;
    }
    if (!reason.trim()) {
      toast.error("Escribe el motivo de la cita");
      return;
    }
    try {
      await save.mutateAsync({
        id: appointment?.id ?? null,
        team_id: player.teamId,
        player_user_id: player.userId,
        scheduled_at: when ? fromLocalInputValue(when) : new Date().toISOString(),
        appointment_type: type,
        reason: reason.trim(),
        place: place.trim() || null,
        notes: notes.trim() || null,
        status,
      });
      toast.success(isEdit ? "Cita actualizada" : "Cita programada");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar la cita");
    }
  };

  const remove = async () => {
    if (!appointment) return;
    try {
      await del.mutateAsync(appointment.id);
      toast.success("Cita eliminada");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo eliminar la cita");
    }
  };

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="md">
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar cita" : "Programar cita"}</EntitySheetTitle>
        <EntitySheetDescription>
          La cita aparece en la Agenda como evento privado: solo la ven el jugador y el cuerpo médico.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <PlayerPicker
          id="ap-player"
          players={players}
          value={playerUserId}
          onChange={setPlayerUserId}
          disabled={isEdit || !!fixedPlayerUserId}
          emptyMessage="No tienes equipos donde puedas registrar información médica."
        />

        <div className="space-y-1.5">
          <Label htmlFor="ap-when">Fecha y hora</Label>
          <Input id="ap-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ap-type">Tipo</Label>
          <select
            id="ap-type"
            value={type}
            onChange={(e) => setType(e.target.value as CheckupType)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {CHECKUP_TYPE_ORDER.map((t) => (
              <option key={t} value={t}>
                {CHECKUP_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ap-reason">Motivo</Label>
          <Input
            id="ap-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="p.ej. Control de rodilla"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ap-place">Lugar</Label>
          <Input id="ap-place" value={place} onChange={(e) => setPlace(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ap-notes">Notas</Label>
          <Textarea id="ap-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>

        {isEdit ? (
          <div className="space-y-1.5">
            <Label htmlFor="ap-status">Estado</Label>
            <select
              id="ap-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {(Object.keys(APPOINTMENT_STATUS_LABEL) as AppointmentStatus[]).map((s) => (
                <option key={s} value={s}>
                  {APPOINTMENT_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </EntitySheetBody>

      <EntitySheetFooter>
        {isEdit ? (
          <Button
            type="button"
            variant="ghost"
            className="mr-auto text-destructive hover:bg-destructive/10"
            onClick={remove}
            disabled={del.isPending}
          >
            Eliminar
          </Button>
        ) : null}
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" className="glow-primary" onClick={submit} disabled={save.isPending}>
          {save.isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Programar cita"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
