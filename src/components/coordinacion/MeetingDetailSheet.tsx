import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Pencil, Check, X as XIcon, MapPin, CalendarClock, Video, ExternalLink } from "lucide-react";
import { isMeetingUrl } from "./MeetingFormDialog";
import { DetailSheet, DetailField } from "@/components/squad/DetailSheet";
import { LocationDisplay } from "@/components/calendar/LocationDisplay";
import { StatusBadge, type StatusVariant } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/calendar-utils";
import type { MeetingRow, MeetingStatus, AttendanceStatus } from "@/hooks/useCoordinacion";
import { cn } from "@/lib/utils";

const M_STATUSES: { key: MeetingStatus; label: string }[] = [
  { key: "programada", label: "Programada" },
  { key: "en_curso", label: "En curso" },
  { key: "en_pausa", label: "En pausa" },
  { key: "finalizada", label: "Finalizada" },
  { key: "cancelada", label: "Cancelada" },
];

const M_STATUS_VARIANT: Record<MeetingStatus, StatusVariant> = {
  programada: "info",
  en_curso: "pending",
  en_pausa: "info",
  finalizada: "approved",
  cancelada: "rejected",
};

const M_STATUS_LABEL: Record<MeetingStatus, string> = {
  programada: "Programada",
  en_curso: "En curso",
  en_pausa: "En pausa",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
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
  if (!meeting) return null;
  const me = meeting.attendees.find((a) => a.user_id === userId);
  const isPast = new Date(meeting.starts_at) < new Date();

  const setStatus = useMutation({
    mutationFn: async (status: MeetingStatus) => {
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
      const { error } = await supabase.from("meetings").delete().eq("id", meeting.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Junta eliminada");
      qc.invalidateQueries({ queryKey: ["coord-meetings", clubId] });
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
  });

  const confirmed = meeting.attendees.filter((a) => a.attendance_status === "confirmado").length;

  return (
    <DetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={meeting.title}
      description={<StatusBadge variant={M_STATUS_VARIANT[meeting.status]}>{M_STATUS_LABEL[meeting.status]}</StatusBadge>}
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
              onClick={() => {
                if (confirm("¿Eliminar esta junta?")) deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
            </Button>
          </>
        ) : undefined
      }
    >
      {canEdit ? (
        <DetailField label="Estado">
          <div className="flex flex-wrap gap-1.5">
            {M_STATUSES.map((s) => {
              const active = meeting.status === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  disabled={setStatus.isPending}
                  onClick={() => setStatus.mutate(s.key)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
                  )}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </DetailField>
      ) : null}

      <DetailField label="Fecha y hora" icon={CalendarClock}>
        <div className="text-foreground">
          {formatDateTime(meeting.starts_at)}
          {meeting.ends_at ? <span className="text-muted-foreground"> — {formatDateTime(meeting.ends_at)}</span> : null}
        </div>
        {meeting.started_at || meeting.ended_at_actual ? (
          <div className="mt-1 text-xs text-muted-foreground">
            {meeting.started_at ? `Iniciada ${formatDateTime(meeting.started_at)}` : null}
            {meeting.started_at && meeting.ended_at_actual ? " · " : ""}
            {meeting.ended_at_actual ? `Finalizada ${formatDateTime(meeting.ended_at_actual)}` : null}
          </div>
        ) : null}
      </DetailField>

      {meeting.location || (meeting as any).location_id ? (
        <DetailField label="Ubicación" icon={isMeetingUrl(meeting.location ?? "") ? Video : MapPin}>
          <LocationDisplay
            clubId={clubId}
            locationId={(meeting as any).location_id ?? null}
            text={meeting.location}
          />
        </DetailField>
      ) : null}

      {meeting.agenda ? (
        <DetailField label="Agenda">
          <p className="whitespace-pre-wrap text-sm text-foreground/90">{meeting.agenda}</p>
        </DetailField>
      ) : null}

      <DetailField label={`Invitados (${confirmed}/${meeting.attendees.length} confirmados)`}>
        {meeting.attendees.length === 0 ? (
          <span className="text-muted-foreground">Sin invitados</span>
        ) : (
          <ul className="space-y-1.5">
            {meeting.attendees.map((a) => (
              <li key={a.user_id} className="flex items-center justify-between gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[11px] font-medium">
                    {(a.profile?.full_name ?? a.profile?.email ?? "?").slice(0, 1).toUpperCase()}
                  </span>
                  <span className="text-foreground">{a.profile?.full_name ?? a.profile?.email ?? "—"}</span>
                </div>
                <AttendanceChip status={a.attendance_status} />
              </li>
            ))}
          </ul>
        )}
      </DetailField>

      {me && !isPast ? (
        <DetailField label="Mi asistencia">
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
              <XIcon className="mr-1 h-3.5 w-3.5" /> Rechazar
            </Button>
          </div>
        </DetailField>
      ) : null}

      <DetailField label="Minuta / notas">
        {meeting.notes ? (
          <p className="whitespace-pre-wrap text-sm text-foreground/90">{meeting.notes}</p>
        ) : (
          <span className="text-muted-foreground">
            {isPast ? "Aún sin minuta." : "Se agrega después de la junta."}
          </span>
        )}
        {canEdit && isPast ? (
          <div className="mt-2">
            <Button size="sm" variant="ghost" onClick={onEdit}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> {meeting.notes ? "Editar minuta" : "Agregar minuta"}
            </Button>
          </div>
        ) : null}
      </DetailField>
    </DetailSheet>
  );
}

function AttendanceChip({ status }: { status: AttendanceStatus }) {
  const map: Record<AttendanceStatus, { label: string; variant: StatusVariant }> = {
    invitado: { label: "Invitado", variant: "pending" },
    confirmado: { label: "Confirmado", variant: "approved" },
    rechazado: { label: "Rechazado", variant: "rejected" },
  };
  const s = map[status];
  return <StatusBadge variant={s.variant}>{s.label}</StatusBadge>;
}
