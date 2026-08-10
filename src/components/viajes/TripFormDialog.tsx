import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, MapPin, Plane, Trash2, Users, Search } from "lucide-react";
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
  addTraveler,
  removeTraveler,
  TRIP_STATUS_LABEL,
  TRIP_STATUS_ORDER,
  type TripRow,
  type TripStatus,
} from "@/hooks/useTrips";
import { cn } from "@/lib/utils";
import { TeamSelectField } from "@/components/squad/TeamSelectField";
import type { TeamOption } from "@/hooks/useAccess";
import { LocationPicker } from "@/components/calendar/LocationPicker";
import { AttendeePicker, type AttendeeMode } from "@/components/calendar/AttendeePicker";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  /** Equipos donde el usuario puede crear viajes. */
  teams: TeamOption[];
  defaultTeamId?: string | null;
  userId: string;
  trip?: TripRow | null;
  /** Se llama con el id del viaje recién creado para abrir su detalle. */
  onCreated?: (tripId: string) => void;
}

/** Sección visual del formulario (mismo estándar que Solicitudes y Compras). */
function FormSection({
  title,
  icon: Icon,
  hint,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
      <div>
        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Icon className="h-3.5 w-3.5" /> {title}
        </h4>
        {hint ? <p className="mt-1 text-xs text-muted-foreground/80">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
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

/** Selector de partido con buscador (en vez del select nativo). */
function MatchField({
  matches,
  value,
  onChange,
}: {
  matches: { id: string; title: string; starts_at: string; location: string | null }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [search, setSearch] = React.useState("");
  const selected = matches.find((m) => m.id === value) ?? null;
  const filtered = matches.filter((m) => m.title.toLowerCase().includes(search.trim().toLowerCase()));

  if (selected) {
    return (
      <div className="space-y-1.5">
        <Label>Partido asociado</Label>
        <div className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-foreground">{selected.title}</span>
            <span className="block truncate text-xs text-muted-foreground">{formatDateTime(selected.starts_at)}</span>
          </span>
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")}>
            Quitar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="trip-match">Partido asociado (opcional)</Label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="trip-match"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar partido del equipo…"
          className="pl-9"
        />
      </div>
      {matches.length === 0 ? (
        <p className="text-xs text-muted-foreground">No hay partidos registrados para este equipo.</p>
      ) : (
        <ul className="max-h-40 space-y-1 overflow-y-auto">
          {filtered.slice(0, 20).map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => onChange(m.id)}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-white/[0.04] hover:text-foreground"
              >
                <span className="block truncate text-foreground">{m.title}</span>
                <span className="block truncate text-xs">{formatDateTime(m.starts_at)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function TripFormDialog({
  open,
  onOpenChange,
  clubId,
  teams,
  defaultTeamId,
  userId,
  trip,
  onCreated,
}: Props) {
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
  const [travelerIds, setTravelerIds] = React.useState<Set<string>>(new Set());
  const [attendeeMode, setAttendeeMode] = React.useState<AttendeeMode>("auto");

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
    setTravelerIds(new Set((trip?.travelers ?? []).map((t) => t.user_id)));
    setAttendeeMode(trip ? "detect" : "auto");
  }, [open, trip]);

  // Al cambiar de equipo, el partido ligado y la convocatoria dejan de ser válidos.
  React.useEffect(() => {
    if (isEdit) return;
    setMatchId("");
    setTravelerIds(new Set());
    setAttendeeMode("auto");
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

      if (isEdit && trip) {
        await updateTrip(trip.id, payload);
        // Sincroniza la convocatoria: altas y bajas.
        const current = new Map(trip.travelers.map((t) => [t.user_id, t.id] as const));
        for (const uid of travelerIds) if (!current.has(uid)) await addTraveler(trip.id, uid, null);
        for (const [uid, rowId] of current) if (!travelerIds.has(uid)) await removeTraveler(rowId);
        return trip.id;
      }

      const created = await createTrip(clubId, teamId, userId, payload);
      for (const uid of travelerIds) await addTraveler(created.id, uid, null);
      return created.id;
    },
    onSuccess: (tripId) => {
      toast.success(isEdit ? "Viaje actualizado" : "Viaje creado");
      invalidate();
      onOpenChange(false);
      if (!isEdit && tripId) onCreated?.(tripId);
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
          Registra lo esencial. La logística (transporte, vuelos, hoteles y equipaje) se agrega después dentro del
          detalle del viaje.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <FormSection title="Datos del viaje" icon={Plane}>
          <TeamSelectField
            id="trip-team"
            label="Categoría"
            teams={teams}
            value={teamId}
            onChange={setTeamId}
            disabled={isEdit}
          />

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

          <MatchField matches={(matchesQ.data ?? []) as any} value={matchId} onChange={setMatchId} />
        </FormSection>

        <FormSection title="Fechas" icon={CalendarClock} hint="Se guardan con fecha y hora para verse en la Agenda.">
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
        </FormSection>

        <FormSection title="Punto de reunión y cita" icon={MapPin}>
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
            <Label htmlFor="trip-meeting-at">Hora de citación</Label>
            <Input
              id="trip-meeting-at"
              type="datetime-local"
              value={meetingAt}
              onChange={(e) => setMeetingAt(e.target.value)}
            />
          </div>
        </FormSection>

        <FormSection title="Convocados" icon={Users} hint="Por defecto va toda la categoría; puedes personalizarla.">
          <AttendeePicker
            clubId={clubId}
            teamId={teamId}
            value={travelerIds}
            onChange={setTravelerIds}
            label="Convocatoria"
            mode={attendeeMode}
            onModeChange={setAttendeeMode}
          />
        </FormSection>

        <FormSection title="Detalles" icon={CalendarClock}>
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
        </FormSection>
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
