import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { EVENT_TYPES, type EventType } from "@/lib/eventTypes";
import { toLocalInputValue, fromLocalInputValue } from "@/lib/calendar-utils";
import { saveCalendarEvent } from "@/lib/calendarEvents";
import { AttendeePicker } from "@/components/calendar/AttendeePicker";
import { LocationField } from "@/components/calendar/LocationField";
import type { CalendarEventRow } from "@/hooks/useCalendarEvents";
import { TeamSelectField } from "@/components/squad/TeamSelectField";
import type { TeamOption } from "@/hooks/useAccess";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  /** Equipos donde el usuario puede crear eventos. */
  teams: TeamOption[];
  /** Equipo preseleccionado (filtro activo o equipo del evento en edición). */
  defaultTeamId?: string | null;
  userId: string;
  defaultDate?: Date;
  event?: CalendarEventRow | null;
}

export function EventFormDialog({ open, onOpenChange, clubId, teams, defaultTeamId, userId, defaultDate, event }: Props) {
  const isEdit = !!event;
  const firstTeamId = teams[0]?.id ?? null;
  const [teamId, setTeamId] = React.useState<string | null>(
    event?.team_id ?? defaultTeamId ?? firstTeamId,
  );
  React.useEffect(() => {
    if (!open) return;
    setTeamId(event?.team_id ?? defaultTeamId ?? firstTeamId);
  }, [open, event?.team_id, defaultTeamId, firstTeamId]);
  const qc = useQueryClient();
  const [step, setStep] = React.useState<"type" | "form">(isEdit ? "form" : "type");
  const [eventType, setEventType] = React.useState<EventType>(event?.event_type ?? "entrenamiento");
  const [title, setTitle] = React.useState(event?.title ?? "");
  const [startsAt, setStartsAt] = React.useState<string>(
    event?.starts_at
      ? toLocalInputValue(event.starts_at)
      : defaultDate
        ? toLocalInputValue(new Date(defaultDate.setHours(18, 0, 0, 0)).toISOString())
        : "",
  );
  const [endsAt, setEndsAt] = React.useState<string>(event?.ends_at ? toLocalInputValue(event.ends_at) : "");
  const [location, setLocation] = React.useState(event?.location ?? "");
  const [locationId, setLocationId] = React.useState<string | null>((event as any)?.location_id ?? null);
  const [description, setDescription] = React.useState(event?.description ?? "");
  const [attendeeIds, setAttendeeIds] = React.useState<Set<string>>(new Set());

  // Al cambiar de equipo, la lista de asistentes deja de ser válida.
  React.useEffect(() => {
    if (!isEdit) setAttendeeIds(new Set());
  }, [teamId, isEdit]);

  React.useEffect(() => {
    if (!open) return;
    if (!isEdit) {
      setStep("type");
      setEventType("entrenamiento");
      setTitle("");
      setStartsAt(defaultDate ? toLocalInputValue(new Date(defaultDate.setHours(18, 0, 0, 0)).toISOString()) : "");
      setEndsAt("");
      setLocation("");
      setLocationId(null);
      setDescription("");
      setAttendeeIds(new Set());
    } else if (event) {
      setStep("form");
      setEventType(event.event_type);
      setTitle(event.title);
      setStartsAt(toLocalInputValue(event.starts_at));
      setEndsAt(event.ends_at ? toLocalInputValue(event.ends_at) : "");
      setLocation(event.location ?? "");
      setLocationId((event as any).location_id ?? null);
      setDescription(event.description ?? "");
    }
  }, [open, isEdit, event, defaultDate]);

  React.useEffect(() => {
    if (!isEdit || !event) return;
    supabase
      .from("event_attendees")
      .select("user_id")
      .eq("event_id", event.id)
      .then(({ data }) => {
        setAttendeeIds(new Set((data ?? []).map((r) => r.user_id)));
      });
  }, [isEdit, event]);

  const mutation = useMutation({
    mutationFn: async () => {
      await saveCalendarEvent({
        eventId: event?.id ?? null,
        clubId,
        teamId: teamId!,
        eventType,
        title,
        startsAt: startsAt ? fromLocalInputValue(startsAt) : "",
        endsAt: endsAt ? fromLocalInputValue(endsAt) : null,
        location,
        locationId,
        description,
        attendeeIds: [...attendeeIds],
        userId,
      });
    },
    onSuccess: () => {
      toast.success(isEdit ? "Evento actualizado" : "Evento creado");
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
      qc.invalidateQueries({ queryKey: ["event-attendees"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo guardar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!event) return;
      const { error } = await supabase.from("calendar_events").delete().eq("id", event.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Evento eliminado");
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
  });

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange}>
      <EntitySheetHeader>
        <EntitySheetTitle>
          {isEdit ? "Editar evento" : step === "type" ? "Nuevo evento" : "Detalles del evento"}
        </EntitySheetTitle>
        <EntitySheetDescription>
          {step === "type" ? "Selecciona el tipo de evento." : "Completa la información y los asistentes."}
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        {step === "type" && !isEdit ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {EVENT_TYPES.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => {
                  setEventType(t.key);
                  setStep("form");
                }}
                className="glass flex flex-col items-center gap-2 p-4 text-center transition-colors hover:bg-white/[0.06]"
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${t.cssVar}20`, color: t.cssVar }}
                >
                  <t.icon className="h-5 w-5" />
                </span>
                <span className="text-sm font-medium text-foreground">{t.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  backgroundColor: `${(EVENT_TYPES.find((t) => t.key === eventType)?.cssVar) ?? "hsl(0 0% 50%)"}20`,
                  color: EVENT_TYPES.find((t) => t.key === eventType)?.cssVar,
                }}
              >
                {EVENT_TYPES.find((t) => t.key === eventType)?.label}
              </span>
              {!isEdit ? (
                <button
                  type="button"
                  onClick={() => setStep("type")}
                  className="text-xs text-muted-foreground underline underline-offset-2"
                >
                  Cambiar tipo
                </button>
              ) : null}
            </div>

            <TeamSelectField
              id="event-team"
              teams={teams}
              value={teamId}
              onChange={setTeamId}
              disabled={isEdit}
            />

            <div className="space-y-1.5">
              <Label htmlFor="event-title">Título</Label>
              <Input id="event-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="p.ej. Partido vs. Rival FC" />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="event-start">Fecha y hora</Label>
                <Input id="event-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="event-end">Fin (opcional)</Label>
                <Input id="event-end" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
              </div>
            </div>

            <LocationField
              clubId={clubId}
              userId={userId}
              value={location}
              onChange={setLocation}
              locationId={locationId}
              onLocationIdChange={setLocationId}
            />

            <div className="space-y-1.5">
              <Label htmlFor="event-desc">Descripción</Label>
              <Textarea id="event-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>

            <AttendeePicker
              clubId={clubId}
              teamId={teamId}
              value={attendeeIds}
              onChange={setAttendeeIds}
            />
          </>
        )}
      </EntitySheetBody>

      {step === "form" || isEdit ? (
        <EntitySheetFooter>
          {isEdit ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-auto"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar
            </Button>
          ) : null}
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {isEdit ? "Guardar cambios" : "Crear evento"}
          </Button>
        </EntitySheetFooter>
      ) : null}
    </EntitySheet>
  );
}
