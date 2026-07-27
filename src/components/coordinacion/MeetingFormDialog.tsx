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
import { supabase } from "@/integrations/supabase/client";
import { toLocalInputValue, fromLocalInputValue } from "@/lib/calendar-utils";
import { useClubStaff, type MeetingRow } from "@/hooks/useCoordinacion";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  meeting?: MeetingRow | null;
  canEditNotes?: boolean;
}

export function MeetingFormDialog({ open, onOpenChange, clubId, userId, meeting }: Props) {
  const isEdit = !!meeting;
  const qc = useQueryClient();
  const staffQ = useClubStaff(clubId);

  const [title, setTitle] = React.useState("");
  const [startsAt, setStartsAt] = React.useState("");
  const [endsAt, setEndsAt] = React.useState("");
  const [locationType, setLocationType] = React.useState<"presencial" | "videollamada">("presencial");
  const [location, setLocation] = React.useState("");
  const [agenda, setAgenda] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [invitees, setInvitees] = React.useState<Set<string>>(new Set());
  const [search, setSearch] = React.useState("");

  const isPast = meeting ? new Date(meeting.starts_at) < new Date() : false;

  React.useEffect(() => {
    if (!open) return;
    setTitle(meeting?.title ?? "");
    setStartsAt(meeting?.starts_at ? toLocalInputValue(meeting.starts_at) : "");
    setEndsAt(meeting?.ends_at ? toLocalInputValue(meeting.ends_at) : "");
    const loc = meeting?.location ?? "";
    setLocationType(isMeetingUrl(loc) ? "videollamada" : "presencial");
    setLocation(loc);
    setAgenda(meeting?.agenda ?? "");
    setNotes(meeting?.notes ?? "");
    setInvitees(new Set((meeting?.attendees ?? []).map((a) => a.user_id)));
    setSearch("");
  }, [open, meeting]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("El título es obligatorio");
      if (!startsAt) throw new Error("La fecha y hora son obligatorias");
      const payload = {
        club_id: clubId,
        title: title.trim(),
        starts_at: fromLocalInputValue(startsAt),
        ends_at: endsAt ? fromLocalInputValue(endsAt) : null,
        location: location.trim() || null,
        agenda: agenda.trim() || null,
        notes: isPast ? (notes.trim() || null) : (meeting?.notes ?? null),
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
      const { data: existing } = await supabase
        .from("meeting_attendees")
        .select("user_id")
        .eq("meeting_id", meetingId);
      const existingIds = new Set((existing ?? []).map((r) => r.user_id));
      const toAdd = [...invitees].filter((id) => !existingIds.has(id));
      const toRemove = [...existingIds].filter((id) => !invitees.has(id));
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
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
  });

  const filtered = (staffQ.data ?? []).filter((m) =>
    (m.full_name ?? m.email ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  function toggle(id: string) {
    setInvitees((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange}>
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar junta" : "Nueva junta"}</EntitySheetTitle>
        <EntitySheetDescription>
          La junta se sincroniza con el calendario de los invitados.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-1.5">
          <Label htmlFor="m-title">Título</Label>
          <Input id="m-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="p.ej. Reunión semanal de staff" />
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
                "flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
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
                "flex-1 flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                locationType === "videollamada"
                  ? "border-primary bg-primary/15 text-primary"
                  : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
              )}
            >
              <Video className="h-3.5 w-3.5" /> Videollamada
            </button>
          </div>
          <Input
            id="m-loc"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={locationType === "videollamada" ? "https://zoom.us/… o link de Teams/Meet" : "Sala, oficina, dirección…"}
            type={locationType === "videollamada" ? "url" : "text"}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="m-agenda">Agenda</Label>
          <Textarea id="m-agenda" value={agenda} onChange={(e) => setAgenda(e.target.value)} rows={3} />
        </div>

        {isEdit && isPast ? (
          <div className="space-y-1.5">
            <Label htmlFor="m-notes">Minuta / notas</Label>
            <Textarea id="m-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} placeholder="Registra los acuerdos de la junta…" />
          </div>
        ) : null}

        <div className="space-y-1.5">
          <Label>Invitados ({invitees.size})</Label>
          <Input placeholder="Buscar staff…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <div className="max-h-48 overflow-y-auto rounded-lg border border-border/60">
            {filtered.length === 0 ? (
              <div className="p-3 text-sm text-muted-foreground">Sin miembros</div>
            ) : (
              filtered.map((m) => {
                const selected = invitees.has(m.id);
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => toggle(m.id)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-white/[0.04]",
                      selected && "bg-white/[0.06]",
                    )}
                  >
                    <span className="truncate">
                      <span className="text-foreground">{m.full_name ?? m.email ?? "—"}</span>
                      {m.role_name ? <span className="ml-2 text-xs text-muted-foreground">{m.role_name}</span> : null}
                    </span>
                    <span className={cn("h-4 w-4 shrink-0 rounded border", selected ? "border-primary bg-primary" : "border-border")} />
                  </button>
                );
              })
            )}
          </div>
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        {isEdit ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-auto"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
          </Button>
        ) : null}
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          {isEdit ? "Guardar cambios" : "Crear junta"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
