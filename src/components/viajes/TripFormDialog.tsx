import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { toLocalInputValue, fromLocalInputValue, formatDateTime } from "@/lib/calendar-utils";
import {
  createTrip,
  updateTrip,
  deleteTrip,
  TRIP_STATUS_LABEL,
  TRIP_STATUS_ORDER,
  type TripRow,
  type TripStatus,
} from "@/hooks/useTrips";
import { cn } from "@/lib/utils";
import { TeamSelectField } from "@/components/squad/TeamSelectField";
import type { TeamOption } from "@/hooks/useAccess";
import { LocationPicker } from "@/components/calendar/LocationPicker";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  /** Equipos donde el usuario puede crear viajes. */
  teams: TeamOption[];
  defaultTeamId?: string | null;
  userId: string;
  trip?: TripRow | null;
}

/** Partidos del equipo para ligar el viaje (opcional; Torneo lo llenará después). */
function useTeamMatches(teamId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: ["team-matches", teamId ?? "none"] as const,
    enabled: !!teamId && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("id, title, starts_at, location")
        .eq("team_id", teamId!)
        .eq("event_type", "partido")
        .order("starts_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function TripFormDialog({ open, onOpenChange, clubId, teams, defaultTeamId, userId, trip }: Props) {
  const isEdit = !!trip;
  const qc = useQueryClient();
  const firstTeamId = teams[0]?.id ?? null;
  const [teamId, setTeamId] = React.useState<string | null>(trip?.team_id ?? defaultTeamId ?? firstTeamId);
  React.useEffect(() => {
    if (!open) return;
    setTeamId(trip?.team_id ?? defaultTeamId ?? firstTeamId);
  }, [open, trip?.team_id, defaultTeamId, firstTeamId]);
  const matchesQ = useTeamMatches(teamId, open);

  const [title, setTitle] = React.useState("");
  const [destination, setDestination] = React.useState("");
  const [matchId, setMatchId] = React.useState<string>("");
  const [departureAt, setDepartureAt] = React.useState("");
  const [returnAt, setReturnAt] = React.useState("");
  const [meetingPoint, setMeetingPoint] = React.useState("");
  const [meetingLocationId, setMeetingLocationId] = React.useState<string | null>(null);
  const [meetingAt, setMeetingAt] = React.useState("");
  const [status, setStatus] = React.useState<TripStatus>("planeacion");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setTitle(trip?.title ?? "");
    setDestination(trip?.destination ?? "");
    setMatchId(trip?.match_event_id ?? "");
    setDepartureAt(trip?.departure_at ? toLocalInputValue(trip.departure_at) : "");
    setReturnAt(trip?.return_at ? toLocalInputValue(trip.return_at) : "");
    setMeetingPoint(trip?.meeting_point ?? "");
    setMeetingLocationId(((trip as any)?.meeting_location_id as string | null) ?? null);
    setMeetingAt(trip?.meeting_at ? toLocalInputValue(trip.meeting_at) : "");
    setStatus(trip?.status ?? "planeacion");
    setNotes(trip?.notes ?? "");
  }, [open, trip]);

  // Al cambiar de equipo, el partido ligado deja de ser válido.
  React.useEffect(() => {
    if (!isEdit) setMatchId("");
  }, [teamId, isEdit]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["trips"] });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!teamId) throw new Error("Selecciona un equipo");
      if (!title.trim()) throw new Error("El título es obligatorio");
      if (!departureAt) throw new Error("La fecha y hora de salida son obligatorias");
      if (returnAt && new Date(returnAt) < new Date(departureAt)) {
        throw new Error("El regreso no puede ser antes de la salida");
      }
      const payload = {
        title: title.trim(),
        destination: destination.trim() || null,
        match_event_id: matchId || null,
        departure_at: fromLocalInputValue(departureAt),
        return_at: returnAt ? fromLocalInputValue(returnAt) : null,
        meeting_point: meetingPoint.trim() || null,
        meeting_location_id: meetingLocationId,
        meeting_at: meetingAt ? fromLocalInputValue(meetingAt) : null,
        status,
        notes: notes.trim() || null,
      };
      if (isEdit && trip) await updateTrip(trip.id, payload);
      else await createTrip(clubId, teamId, userId, payload);
    },
    onSuccess: () => {
      toast.success(isEdit ? "Viaje actualizado" : "Viaje creado");
      invalidate();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo guardar"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!trip) return;
      await deleteTrip(trip.id);
    },
    onSuccess: () => {
      toast.success("Viaje eliminado");
      invalidate();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
  });

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange}>
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar viaje" : "Nuevo viaje"}</EntitySheetTitle>
        <EntitySheetDescription>
          Los horarios se guardan con fecha y hora para que el viaje pueda verse en la Agenda.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <TeamSelectField id="trip-team" teams={teams} value={teamId} onChange={setTeamId} disabled={isEdit} />

        <div className="space-y-1.5">
          <Label htmlFor="trip-title">Título</Label>
          <Input
            id="trip-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Jornada 5 · visita a Tijuana"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="trip-destination">Destino</Label>
          <Input
            id="trip-destination"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Tijuana, B.C."
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="trip-match">Partido asociado (opcional)</Label>
          <select
            id="trip-match"
            value={matchId}
            onChange={(e) => setMatchId(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">Sin partido asociado</option>
            {(matchesQ.data ?? []).map((m: any) => (
              <option key={m.id} value={m.id}>
                {m.title} · {formatDateTime(m.starts_at)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="trip-departure">Salida</Label>
            <Input
              id="trip-departure"
              type="datetime-local"
              value={departureAt}
              onChange={(e) => setDepartureAt(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trip-return">Regreso (opcional)</Label>
            <Input
              id="trip-return"
              type="datetime-local"
              value={returnAt}
              onChange={(e) => setReturnAt(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <LocationPicker
            id="trip-meeting-point"
            label="Punto de reunión"
            placeholder="Estacionamiento del estadio…"
            clubId={clubId}
            userId={userId}
            value={meetingPoint}
            onChange={setMeetingPoint}
            locationId={meetingLocationId}
            onLocationIdChange={setMeetingLocationId}
          />
          <div className="space-y-1.5">
            <Label htmlFor="trip-meeting-at">Hora de citatorio</Label>
            <Input
              id="trip-meeting-at"
              type="datetime-local"
              value={meetingAt}
              onChange={(e) => setMeetingAt(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Estado</Label>
          <div className="flex flex-wrap gap-2">
            {TRIP_STATUS_ORDER.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  status === s
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
                )}
              >
                {TRIP_STATUS_LABEL[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="trip-notes">Notas</Label>
          <Textarea
            id="trip-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Indicaciones generales para el grupo"
          />
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        {isEdit ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive sm:mr-auto"
            onClick={() => deleteMutation.mutate()}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
          </Button>
        ) : null}
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending} className="glow-primary">
          {mutation.isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear viaje"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
