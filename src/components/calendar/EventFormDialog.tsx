import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { EVENT_TYPES, type EventType } from "@/lib/eventTypes";
import { toLocalInputValue, fromLocalInputValue } from "@/lib/calendar-utils";
import { useTeamMembers, type TeamMember } from "@/hooks/useTeamMembers";
import type { CalendarEventRow } from "@/hooks/useCalendarEvents";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  teamId: string;
  userId: string;
  defaultDate?: Date;
  event?: CalendarEventRow | null;
}

export function EventFormDialog({ open, onOpenChange, clubId, teamId, userId, defaultDate, event }: Props) {
  const isEdit = !!event;
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
  const [description, setDescription] = React.useState(event?.description ?? "");
  const [attendeeIds, setAttendeeIds] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState("");

  const membersQ = useTeamMembers(teamId, clubId);

  React.useEffect(() => {
    if (!open) return;
    // Reset when reopened for creating.
    if (!isEdit) {
      setStep("type");
      setEventType("entrenamiento");
      setTitle("");
      setStartsAt(defaultDate ? toLocalInputValue(new Date(defaultDate.setHours(18, 0, 0, 0)).toISOString()) : "");
      setEndsAt("");
      setLocation("");
      setDescription("");
      setAttendeeIds(new Set());
      setSearch("");
    } else if (event) {
      setStep("form");
      setEventType(event.event_type);
      setTitle(event.title);
      setStartsAt(toLocalInputValue(event.starts_at));
      setEndsAt(event.ends_at ? toLocalInputValue(event.ends_at) : "");
      setLocation(event.location ?? "");
      setDescription(event.description ?? "");
    }
  }, [open, isEdit, event, defaultDate]);

  // Load existing attendees when editing.
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
      if (!title.trim()) throw new Error("El título es obligatorio");
      if (!startsAt) throw new Error("La fecha y hora son obligatorias");
      const payload = {
        club_id: clubId,
        team_id: teamId,
        event_type: eventType,
        title: title.trim(),
        starts_at: fromLocalInputValue(startsAt),
        ends_at: endsAt ? fromLocalInputValue(endsAt) : null,
        location: location.trim() || null,
        description: description.trim() || null,
      };
      let eventId = event?.id;
      if (isEdit && event) {
        const { error } = await supabase.from("calendar_events").update(payload).eq("id", event.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("calendar_events")
          .insert({ ...payload, created_by: userId })
          .select("id")
          .single();
        if (error) throw error;
        eventId = data.id;
      }
      if (!eventId) return;
      // Sync attendees.
      const { data: existing } = await supabase
        .from("event_attendees")
        .select("user_id")
        .eq("event_id", eventId);
      const existingIds = new Set((existing ?? []).map((r) => r.user_id));
      const toAdd = [...attendeeIds].filter((id) => !existingIds.has(id));
      const toRemove = [...existingIds].filter((id) => !attendeeIds.has(id));
      if (toAdd.length) {
        const { error } = await supabase
          .from("event_attendees")
          .insert(toAdd.map((user_id) => ({ event_id: eventId!, user_id })));
        if (error) throw error;
      }
      if (toRemove.length) {
        const { error } = await supabase
          .from("event_attendees")
          .delete()
          .eq("event_id", eventId)
          .in("user_id", toRemove);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Evento actualizado" : "Evento creado");
      qc.invalidateQueries({ queryKey: ["calendar-events", teamId] });
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
      qc.invalidateQueries({ queryKey: ["calendar-events", teamId] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
  });

  const filteredMembers = (membersQ.data ?? []).filter((m: TeamMember) =>
    (m.full_name ?? m.email ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  function toggleAttendee(id: string) {
    setAttendeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {isEdit ? "Editar evento" : step === "type" ? "Nuevo evento" : "Detalles del evento"}
          </DialogTitle>
          <DialogDescription>
            {step === "type" ? "Selecciona el tipo de evento." : "Completa la información y los asistentes."}
          </DialogDescription>
        </DialogHeader>

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
          <div className="space-y-4">
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

            <div className="space-y-1.5">
              <Label htmlFor="event-loc">Ubicación</Label>
              <Input id="event-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Estadio, sala, ciudad…" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="event-desc">Descripción</Label>
              <Textarea id="event-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
            </div>

            <div className="space-y-1.5">
              <Label>Asistentes ({attendeeIds.size})</Label>
              <Input placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <div className="max-h-48 overflow-y-auto rounded-lg border border-border/60">
                {filteredMembers.length === 0 ? (
                  <div className="p-3 text-sm text-muted-foreground">Sin miembros</div>
                ) : (
                  filteredMembers.map((m) => {
                    const selected = attendeeIds.has(m.id);
                    return (
                      <button
                        type="button"
                        key={m.id}
                        onClick={() => toggleAttendee(m.id)}
                        className={cn(
                          "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-white/[0.04]",
                          selected && "bg-white/[0.06]",
                        )}
                      >
                        <span className="truncate">
                          <span className="text-foreground">{m.full_name ?? m.email ?? "—"}</span>
                          {m.role_name ? (
                            <span className="ml-2 text-xs text-muted-foreground">{m.role_name}</span>
                          ) : null}
                        </span>
                        <span
                          className={cn(
                            "h-4 w-4 shrink-0 rounded border",
                            selected ? "border-primary bg-primary" : "border-border",
                          )}
                        />
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {step === "form" || isEdit ? (
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            {isEdit ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                {isEdit ? "Guardar cambios" : "Crear evento"}
              </Button>
            </div>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
