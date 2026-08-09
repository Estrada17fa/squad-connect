import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Pencil, Check, X as XIcon, MapPin, CalendarClock, Video, Layers } from "lucide-react";
import { isMeetingUrl } from "./MeetingFormDialog";
import { DetailSheet, DetailField, DetailGrid, DetailSection, DetailValue } from "@/components/squad/DetailSheet";
import { LocationDisplay } from "@/components/calendar/LocationDisplay";
import { StatusBadge, type StatusVariant } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/squad/ConfirmDialog";
import { AvatarStack } from "./AvatarStack";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/calendar-utils";
import type { MeetingRow, MeetingStatus, AttendanceStatus } from "@/hooks/useCoordinacion";
import { ATTENDANCE_LABEL, MEETING_STATUS_LABEL } from "@/lib/coordinacion";
import { cn } from "@/lib/utils";

const M_STATUSES: MeetingStatus[] = ["programada", "en_curso", "en_pausa", "finalizada", "cancelada"];

const M_STATUS_VARIANT: Record<MeetingStatus, StatusVariant> = {
  programada: "info",
  en_curso: "pending",
  en_pausa: "info",
  finalizada: "approved",
  cancelada: "rejected",
};

const ATTENDANCE_VARIANT: Record<AttendanceStatus, StatusVariant> = {
  invitado: "pending",
  confirmado: "approved",
  rechazado: "rejected",
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  meeting: MeetingRow | null;
  userId: string;
  clubId: string;
  canEdit: boolean;
  onEdit: () => void;
}

export function MeetingDetailSheet({ open, onOpenChange, meeting, userId, clubId, canEdit, onEdit }: Props) {
  const qc = useQueryClient();
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const setStatus = useMutation({
    mutationFn: async (status: MeetingStatus) => {
      if (!meeting) return;
      const patch: { status: MeetingStatus; started_at?: string; ended_at_actual?: string } = { status };
      if (status === "en_curso" && !meeting.started_at) patch.started_at = new Date().toISOString();
      if (status === "finalizada" && !meeting.ended_at_actual) patch.ended_at_actual = new Date().toISOString();
      const { error } = await supabase.from("meetings").update(patch).eq("id", meeting.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coord-meetings", clubId] }),
    onError: (e: any) => toast.error(e.message ?? "No se pudo actualizar"),
  });

  const setAttendance = useMutation({
    mutationFn: async (status: AttendanceStatus) => {
      if (!meeting) return;
      const { error } = await supabase
        .from("meeting_attendees")
        .update({ attendance_status: status })
        .eq("meeting_id", meeting.id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["coord-meetings", clubId] }),
    onError: (e: any) => toast.error(e.message ?? "No se pudo actualizar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!meeting) return;
      const { error } = await supabase.from("meetings").delete().eq("id", meeting.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Junta eliminada");
      qc.invalidateQueries({ queryKey: ["coord-meetings", clubId] });
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
      setConfirmDelete(false);
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
  });

  if (!meeting) return null;

  const me = meeting.attendees.find((a) => a.user_id === userId);
  const isPast = new Date(meeting.starts_at) < new Date();
  const confirmed = meeting.attendees.filter((a) => a.attendance_status === "confirmado").length;

  return (
    <>
      <DetailSheet
        open={open}
        onOpenChange={onOpenChange}
        title={meeting.title}
        description={
          <StatusBadge variant={M_STATUS_VARIANT[meeting.status]}>{MEETING_STATUS_LABEL[meeting.status]}</StatusBadge>
        }
        headerActions={
          canEdit ? (
            <>
              <Button size="sm" variant="secondary" onClick={onEdit}>
                <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
              </Button>
            </>
          ) : undefined
        }
      >
        {canEdit ? (
          <DetailSection title="Estado">
            <div className="flex flex-wrap gap-1.5">
              {M_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={setStatus.isPending}
                  onClick={() => setStatus.mutate(s)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    meeting.status === s
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
                  )}
                >
                  {MEETING_STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </DetailSection>
        ) : null}

        <DetailGrid>
          <DetailField label="Fecha y hora" icon={CalendarClock} full>
            <div>
              {formatDateTime(meeting.starts_at)}
              {meeting.ends_at ? (
                <span className="text-muted-foreground"> — {formatDateTime(meeting.ends_at)}</span>
              ) : null}
            </div>
            {meeting.started_at || meeting.ended_at_actual ? (
              <div className="mt-1 text-xs text-muted-foreground">
                {meeting.started_at ? `Iniciada ${formatDateTime(meeting.started_at)}` : null}
                {meeting.started_at && meeting.ended_at_actual ? " · " : ""}
                {meeting.ended_at_actual ? `Finalizada ${formatDateTime(meeting.ended_at_actual)}` : null}
              </div>
            ) : null}
          </DetailField>

          <DetailField label="Alcance" icon={Layers}>
            {meeting.team?.name ?? "Todo el club"}
          </DetailField>

          {meeting.location || meeting.location_id ? (
            <DetailField label="Ubicación" icon={isMeetingUrl(meeting.location ?? "") ? Video : MapPin} full>
              <LocationDisplay clubId={clubId} locationId={meeting.location_id} text={meeting.location} />
            </DetailField>
          ) : null}

          {meeting.agenda ? (
            <DetailField label="Agenda" full>
              <DetailValue value={meeting.agenda} />
            </DetailField>
          ) : null}
        </DetailGrid>

        {me && !isPast ? (
          <DetailSection title="Mi asistencia">
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={me.attendance_status === "confirmado" ? "default" : "secondary"}
                onClick={() => setAttendance.mutate("confirmado")}
                disabled={setAttendance.isPending}
              >
                <Check className="mr-1 h-3.5 w-3.5" /> Confirmar
              </Button>
              <Button
                type="button"
                size="sm"
                variant={me.attendance_status === "rechazado" ? "default" : "ghost"}
                onClick={() => setAttendance.mutate("rechazado")}
                disabled={setAttendance.isPending}
              >
                <XIcon className="mr-1 h-3.5 w-3.5" /> No asisto
              </Button>
            </div>
          </DetailSection>
        ) : null}

        <DetailSection title={`Convocados (${confirmed}/${meeting.attendees.length} confirmados)`}>
          <AvatarStack people={meeting.attendees.map((a) => a.profile)} max={8} size="md" />
          {meeting.attendees.length > 0 ? (
            <ul className="space-y-1.5">
              {meeting.attendees.map((a) => (
                <li key={a.user_id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 [overflow-wrap:anywhere]">
                    {a.profile?.full_name ?? a.profile?.email ?? "—"}
                  </span>
                  <StatusBadge variant={ATTENDANCE_VARIANT[a.attendance_status]}>
                    {ATTENDANCE_LABEL[a.attendance_status]}
                  </StatusBadge>
                </li>
              ))}
            </ul>
          ) : null}
        </DetailSection>

        <DetailSection title="Minuta / notas">
          {meeting.notes ? (
            <DetailValue value={meeting.notes} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {isPast ? "Aún sin minuta." : "Se agrega después de la junta."}
            </p>
          )}
          {canEdit && isPast ? (
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> {meeting.notes ? "Editar minuta" : "Agregar minuta"}
            </Button>
          ) : null}
        </DetailSection>
      </DetailSheet>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="¿Eliminar esta junta?"
        description="También se quitará del calendario de los convocados."
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </>
  );
}
