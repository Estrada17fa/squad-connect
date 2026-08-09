import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, MapPin, Video } from "lucide-react";
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
import { ConfirmDialog } from "@/components/squad/ConfirmDialog";
import { supabase } from "@/integrations/supabase/client";
import { toLocalInputValue, fromLocalInputValue } from "@/lib/calendar-utils";
import type { MeetingRow } from "@/hooks/useCoordinacion";
import { AssignmentPicker, detectScope, type AssignmentValue } from "./AssignmentPicker";
import { cn } from "@/lib/utils";
import { LocationPicker } from "@/components/calendar/LocationPicker";

/** true si la "ubicación" es en realidad un enlace de videollamada. */
export function isMeetingUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  teams: { id: string | null; name: string }[];
  meeting?: MeetingRow | null;
}

export function MeetingFormDialog({ open, onOpenChange, clubId, userId, teams, meeting }: Props) {
  const isEdit = !!meeting;
  const qc = useQueryClient();

  const [title, setTitle] = React.useState("");
  const [startsAt, setStartsAt] = React.useState("");
  const [endsAt, setEndsAt] = React.useState("");
  const [locationType, setLocationType] = React.useState<"presencial" | "videollamada">("presencial");
  const [location, setLocation] = React.useState("");
  const [locationId, setLocationId] = React.useState<string | null>(null);
  const [agenda, setAgenda] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [assignment, setAssignment] = React.useState<AssignmentValue>({
    scope: "personas",
    teamId: null,
    userIds: [],
  });
  const [confirmDelete, setConfirmDelete] = React.useState(false);

  const isPast = meeting ? new Date(meeting.starts_at) < new Date() : false;

  React.useEffect(() => {
    if (!open) return;
    setTitle(meeting?.title ?? "");
    setStartsAt(meeting?.starts_at ? toLocalInputValue(meeting.starts_at) : "");
    setEndsAt(meeting?.ends_at ? toLocalInputValue(meeting.ends_at) : "");
    const loc = meeting?.location ?? "";
    setLocationType(isMeetingUrl(loc) ? "videollamada" : "presencial");
    setLocation(loc);
    setLocationId(meeting?.location_id ?? null);
    setAgenda(meeting?.agenda ?? "");
    setNotes(meeting?.notes ?? "");
    setAssignment(
      meeting
        ? detectScope(meeting.team_id, (meeting.attendees ?? []).map((a) => a.user_id))
        : { scope: "personas", teamId: null, userIds: [userId] },
    );
  }, [open, meeting, userId]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("El título es obligatorio");
      if (!startsAt) throw new Error("La fecha y hora son obligatorias");
      if (assignment.scope === "categoria" && !assignment.teamId)
        throw new Error("Elige la categoría");
      const payload = {
        club_id: clubId,
        team_id: assignment.scope === "categoria" ? assignment.teamId : null,
        title: title.trim(),
        starts_at: fromLocalInputValue(startsAt),
        ends_at: endsAt ? fromLocalInputValue(endsAt) : null,
        location: location.trim() || null,
        location_id: locationType === "presencial" ? locationId : null,
        agenda: agenda.trim() || null,
        notes: isPast ? notes.trim() || null : (meeting?.notes ?? null),
      };
      let meetingId = meeting?.id;
      if (isEdit && meeting) {
        const { error } = await supabase.from("meetings").update(payload).eq("id", meeting.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("meetings")
          .insert({ ...payload, created_by: userId })
          .select("id")
          .single();
        if (error) throw error;
        meetingId = data.id;
      }
      if (!meetingId) return;
      const wanted = new Set(assignment.userIds);
      const { data: existing } = await supabase
        .from("meeting_attendees")
        .select("user_id")
        .eq("meeting_id", meetingId);
      const existingIds = new Set((existing ?? []).map((r) => r.user_id));
      const toAdd = [...wanted].filter((id) => !existingIds.has(id));
      const toRemove = [...existingIds].filter((id) => !wanted.has(id));
      if (toAdd.length) {
        const { error } = await supabase
          .from("meeting_attendees")
          .insert(toAdd.map((user_id) => ({ meeting_id: meetingId!, user_id })));
        if (error) throw error;
      }
      if (toRemove.length) {
        const { error } = await supabase
          .from("meeting_attendees")
          .delete()
          .eq("meeting_id", meetingId)
          .in("user_id", toRemove);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Junta actualizada" : "Junta creada");
      qc.invalidateQueries({ queryKey: ["coord-meetings", clubId] });
      qc.invalidateQueries({ queryKey: ["calendar-events"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo guardar"),
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

  return (
    <>
      <EntitySheet open={open} onOpenChange={onOpenChange}>
        <EntitySheetHeader>
          <EntitySheetTitle>{isEdit ? "Editar junta" : "Nueva junta"}</EntitySheetTitle>
          <EntitySheetDescription>
            La junta se sincroniza con el calendario de los convocados.
          </EntitySheetDescription>
        </EntitySheetHeader>

        <EntitySheetBody>
          <div className="space-y-1.5">
            <Label htmlFor="m-title">Título</Label>
            <Input
              id="m-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="p.ej. Reunión semanal de staff"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="m-start">Fecha y hora</Label>
              <Input id="m-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-end">Fin (opcional)</Label>
              <Input id="m-end" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Ubicación</Label>
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setLocationType("presencial")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                  locationType === "presencial"
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
                )}
              >
                <MapPin className="h-3.5 w-3.5" /> Presencial
              </button>
              <button
                type="button"
                onClick={() => setLocationType("videollamada")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                  locationType === "videollamada"
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
                )}
              >
                <Video className="h-3.5 w-3.5" /> Videollamada
              </button>
            </div>
            {locationType === "videollamada" ? (
              <Input
                id="m-loc"
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  setLocationId(null);
                }}
                placeholder="https://zoom.us/… o link de Teams/Meet"
                type="url"
              />
            ) : (
              <LocationPicker
                id="m-loc"
                label=""
                clubId={clubId}
                userId={userId}
                value={location}
                onChange={setLocation}
                locationId={locationId}
                onLocationIdChange={setLocationId}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="m-agenda">Agenda</Label>
            <Textarea id="m-agenda" value={agenda} onChange={(e) => setAgenda(e.target.value)} rows={3} />
          </div>

          {isEdit && isPast ? (
            <div className="space-y-1.5">
              <Label htmlFor="m-notes">Minuta / notas</Label>
              <Textarea
                id="m-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Registra los acuerdos de la junta…"
              />
            </div>
          ) : null}

          <AssignmentPicker
            clubId={clubId}
            teams={teams}
            value={assignment}
            onChange={setAssignment}
            label="Convocar a"
          />
        </EntitySheetBody>

        <EntitySheetFooter>
          {isEdit ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-auto"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar
            </Button>
          ) : null}
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {isEdit ? "Guardar cambios" : "Crear junta"}
          </Button>
        </EntitySheetFooter>
      </EntitySheet>

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
