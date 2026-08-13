import * as React from "react";
import { CalendarClock, MapPin, Pencil, StickyNote, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  DetailSheet,
  DetailField,
  DetailGrid,
  DetailSection,
  DetailValue,
} from "@/components/squad/DetailSheet";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { formatDateTime } from "@/lib/calendar-utils";
import {
  APPOINTMENT_STATUS_LABEL,
  APPOINTMENT_STATUS_VARIANT,
  CHECKUP_TYPE_LABEL,
  type CheckupType,
} from "@/lib/salud";
import { HealthPersonHeader } from "./HealthPieces";
import { useDeleteAppointment, type AppointmentRow } from "@/hooks/useHealth";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  appointment: AppointmentRow | null;
  canEdit: boolean;
  onEdit?: (a: AppointmentRow) => void;
}

/** Ficha de lectura de una cita médica. Editar abre el AppointmentFormDialog. */
export function AppointmentDetailSheet({ open, onOpenChange, clubId, appointment, canEdit, onEdit }: Props) {
  const removeAppointment = useDeleteAppointment(clubId);
  if (!appointment) return null;

  const type = appointment.appointment_type as CheckupType;

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      size="lg"
      title={appointment.reason}
      description={`Cita médica · ${appointment.player?.full_name ?? "Jugador"}`}
      headerActions={
        canEdit ? (
          <>
            {onEdit ? (
              <Button type="button" size="sm" variant="secondary" onClick={() => onEdit(appointment)}>
                <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
              </Button>
            ) : null}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={async () => {
                try {
                  await removeAppointment.mutateAsync(appointment.id);
                  toast.success("Cita eliminada");
                  onOpenChange(false);
                } catch (e: any) {
                  toast.error(e?.message ?? "No se pudo eliminar la cita");
                }
              }}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
            </Button>
          </>
        ) : undefined
      }
    >
      <div className="space-y-6">
        <HealthPersonHeader
          name={appointment.player?.full_name ?? "Jugador"}
          avatarUrl={appointment.player?.avatar_url}
          subtitle={appointment.team?.name ?? undefined}
          badges={
            <>
              <StatusBadge variant={APPOINTMENT_STATUS_VARIANT[appointment.status]}>
                {APPOINTMENT_STATUS_LABEL[appointment.status]}
              </StatusBadge>
              <StatusBadge variant="neutral">{CHECKUP_TYPE_LABEL[type]}</StatusBadge>
            </>
          }
        />

        <DetailSection title="Cita">
          <div className="glass rounded-lg p-4">
            <DetailGrid>
              <DetailField label="Fecha y hora" icon={CalendarClock}>
                {formatDateTime(appointment.scheduled_at)}
              </DetailField>
              <DetailField label="Tipo">{CHECKUP_TYPE_LABEL[type]}</DetailField>
              <DetailField label="Lugar" icon={MapPin} full>
                <DetailValue value={appointment.place} />
              </DetailField>
              <DetailField label="Motivo" full>
                <DetailValue value={appointment.reason} />
              </DetailField>
              <DetailField label="Notas" icon={StickyNote} full>
                <DetailValue value={appointment.notes} />
              </DetailField>
            </DetailGrid>
          </div>
        </DetailSection>

        <p className="text-xs text-muted-foreground">
          Las citas se publican en la Agenda como evento privado del jugador y del cuerpo médico.
        </p>
      </div>
    </DetailSheet>
  );
}
