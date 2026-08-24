import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarClock,
  MapPin,
  Plane,
  Trash2,
  Users,
  Volleyball,
  X,
  UserPlus,
  ChevronRight,
  Info,
} from "lucide-react";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toLocalInputValue, fromLocalInputValue } from "@/lib/calendar-utils";
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
import { useOurMatches, useMatchCallups, type OurMatch } from "@/hooks/useMatchOps";
import { TeamCrest } from "@/components/torneo/TeamCrest";
import { TravelerPicker, useTeamMembers, initialsOf, type TeamMemberOption } from "@/components/viajes/TravelerPicker";

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

/* ------------------------------------------------------------------ */
/* Utilidades de fecha (solo día, sin hora)                            */
/* ------------------------------------------------------------------ */

/** ISO -> "yyyy-mm-dd" local. */
function toDateInput(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** "yyyy-mm-dd" -> ISO a mediodía local (evita corrimientos de zona horaria). */
function fromDateInput(v: string) {
  const [y, m, d] = v.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0, 0).toISOString();
}

function shiftDate(v: string, days: number) {
  if (!v) return "";
  const [y, m, d] = v.split("-").map(Number);
  const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
  dt.setDate(dt.getDate() + days);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

function longDate(iso: string | null | undefined) {
  if (!iso) return "Sin fecha";
  return new Date(iso).toLocaleDateString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
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

/* ------------------------------------------------------------------ */
/* Paso 1: elegir partido próximo                                      */
/* ------------------------------------------------------------------ */

function MatchPickList({
  matches,
  loading,
  onPick,
  onManual,
}: {
  matches: OurMatch[];
  loading: boolean;
  onPick: (m: OurMatch) => void;
  onManual: () => void;
}) {
  return (
    <div className="space-y-3">
      <FormSection
        title="Elige el partido"
        icon={Volleyball}
        hint="Se precargan fecha, destino, categoría y los jugadores convocados."
      >
        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando partidos…</p>
        ) : matches.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-4 text-center">
            <Volleyball className="mx-auto h-5 w-5 text-muted-foreground/60" />
            <p className="mt-2 text-sm text-muted-foreground">No hay partidos próximos registrados.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {matches.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onPick(m)}
                  className="relative flex w-full items-center gap-3 overflow-hidden rounded-xl border border-border/60 py-3 pl-4 pr-3 text-left transition-colors hover:bg-white/[0.04]"
                >
                  <span className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden />
                  <TeamCrest path={m.rival?.crest_path ?? null} name={m.rival?.name ?? "Rival"} className="h-9 w-9" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {m.isHome ? "vs " : "Visita a "}
                      {m.rival?.name ?? "Por definir"}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {longDate(m.kickoff_at)}
                      {m.venue ? ` · ${m.venue}` : ""}
                    </span>
                    <span className="block truncate text-[11px] uppercase tracking-wide text-muted-foreground/70">
                      {m.tournament_name}
                      {m.matchday ? ` · Jornada ${m.matchday}` : ""}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </FormSection>

      <Button type="button" variant="outline" className="w-full" onClick={onManual}>
        Crear viaje sin partido
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fila de persona seleccionada                                        */
/* ------------------------------------------------------------------ */

function PersonRow({
  name,
  subtitle,
  avatarUrl,
  onRemove,
}: {
  name: string;
  subtitle?: string | null;
  avatarUrl?: string | null;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-border/60 px-3 py-2">
      <Avatar className="h-8 w-8">
        <AvatarImage src={avatarUrl ?? undefined} alt="" />
        <AvatarFallback className="text-xs">{initialsOf(name, null)}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm text-foreground">{name}</span>
        {subtitle ? <span className="block truncate text-xs text-muted-foreground">{subtitle}</span> : null}
      </span>
      <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={onRemove}>
        <X className="h-4 w-4" />
      </Button>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Formulario                                                          */
/* ------------------------------------------------------------------ */

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
  const [step, setStep] = React.useState<"pick" | "form">(isEdit ? "form" : "pick");
  const [match, setMatch] = React.useState<OurMatch | null>(null);

  const [title, setTitle] = React.useState("");
  const [destination, setDestination] = React.useState("");
  const [departureDate, setDepartureDate] = React.useState("");
  const [returnDate, setReturnDate] = React.useState("");
  const [meetingPoint, setMeetingPoint] = React.useState("");
  const [meetingLocationId, setMeetingLocationId] = React.useState<string | null>(null);
  const [meetingAt, setMeetingAt] = React.useState("");
  const [status, setStatus] = React.useState<TripStatus>("planeacion");
  const [notes, setNotes] = React.useState("");
  const [travelerIds, setTravelerIds] = React.useState<Set<string>>(new Set());
  const [attendeeMode, setAttendeeMode] = React.useState<AttendeeMode>("auto");

  /** Convocatoria cuando el viaje viene de un partido. */
  const [playerIds, setPlayerIds] = React.useState<Set<string>>(new Set());
  const [staffIds, setStaffIds] = React.useState<Set<string>>(new Set());
  const [staffOpen, setStaffOpen] = React.useState(false);

  const matchesQ = useOurMatches(open && !isEdit ? clubId : null);
  const upcoming = React.useMemo(() => {
    const from = Date.now() - 12 * 60 * 60 * 1000;
    return (matchesQ.data ?? [])
      .filter((m) => m.kickoff_at && new Date(m.kickoff_at).getTime() >= from && m.status !== "jugado")
      .slice(0, 30);
  }, [matchesQ.data]);

  const callupsQ = useMatchCallups(match ? [match.id] : []);
  const membersQ = useTeamMembers(clubId, teamId);

  // Reinicia el formulario cada vez que se abre.
  React.useEffect(() => {
    if (!open) return;
    setTeamId(trip?.team_id ?? defaultTeamId ?? firstTeamId);
    setStep(trip ? "form" : "pick");
    setMatch(null);
    setTitle(trip?.title ?? "");
    setDestination(trip?.destination ?? "");
    setDepartureDate(toDateInput(trip?.departure_at));
    setReturnDate(toDateInput(trip?.return_at));
    setMeetingPoint(trip?.meeting_point ?? "");
    setMeetingLocationId(((trip as any)?.meeting_location_id as string | null) ?? null);
    setMeetingAt(trip?.meeting_at ? toLocalInputValue(trip.meeting_at) : "");
    setStatus(trip?.status ?? "planeacion");
    setNotes(trip?.notes ?? "");
    setTravelerIds(new Set((trip?.travelers ?? []).map((t) => t.user_id)));
    setAttendeeMode(trip ? "detect" : "auto");
    setPlayerIds(new Set());
    setStaffIds(new Set());
    setStaffOpen(false);
  }, [open, trip, defaultTeamId, firstTeamId]);

  // Precarga los convocados del partido elegido.
  React.useEffect(() => {
    if (!match || !callupsQ.data) return;
    setPlayerIds(new Set(callupsQ.data.map((c) => c.user_id)));
  }, [match, callupsQ.data]);

  const pickMatch = (m: OurMatch) => {
    setMatch(m);
    if (m.tournament_team_id && teams.some((t) => t.id === m.tournament_team_id)) {
      setTeamId(m.tournament_team_id);
    }
    const rival = m.rival?.name ?? "rival";
    setTitle(
      m.isHome
        ? `${m.matchday ? `Jornada ${m.matchday} · ` : ""}vs ${rival}`
        : `${m.matchday ? `Jornada ${m.matchday} · ` : ""}Visita a ${rival}`,
    );
    setDestination(!m.isHome ? m.venue ?? "" : "");
    const day = toDateInput(m.kickoff_at);
    setDepartureDate(day);
    setReturnDate(day);
    setStep("form");
  };

  const startManual = () => {
    setMatch(null);
    setStep("form");
  };

  const memberById = React.useMemo(() => {
    const map = new Map<string, TeamMemberOption>();
    for (const m of membersQ.data ?? []) map.set(m.id, m);
    return map;
  }, [membersQ.data]);

  const callupById = React.useMemo(() => {
    const map = new Map<string, { name: string; avatar: string | null }>();
    for (const c of callupsQ.data ?? [])
      map.set(c.user_id, { name: c.profile?.full_name ?? "Jugador", avatar: c.profile?.avatar_url ?? null });
    return map;
  }, [callupsQ.data]);

  const fromMatch = !isEdit && !!match;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["trips"] });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!teamId) throw new Error("Selecciona un equipo");
      if (!title.trim()) throw new Error("El título es obligatorio");
      if (!departureDate) throw new Error("La fecha de salida es obligatoria");
      if (returnDate && returnDate < departureDate) {
        throw new Error("El regreso no puede ser antes de la salida");
      }
      const payload = {
        title: title.trim(),
        destination: destination.trim() || null,
        match_event_id: fromMatch ? match?.calendar_event_id ?? null : trip?.match_event_id ?? null,
        departure_at: fromDateInput(departureDate),
        return_at: returnDate ? fromDateInput(returnDate) : null,
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
      const finalIds = fromMatch ? new Set([...playerIds, ...staffIds]) : travelerIds;
      for (const uid of finalIds) await addTraveler(created.id, uid, null);
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

  const totalTravelers = fromMatch ? playerIds.size + staffIds.size : travelerIds.size;

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange}>
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar viaje" : "Nuevo viaje"}</EntitySheetTitle>
        <EntitySheetDescription>
          {step === "pick" && !isEdit
            ? "Elige el partido y el viaje se arma solo. La logística se agrega después en el detalle."
            : "Registra lo esencial. Transporte, vuelos, hoteles y equipaje se agregan después dentro del detalle."}
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        {step === "pick" && !isEdit ? (
          <MatchPickList
            matches={upcoming}
            loading={matchesQ.isLoading}
            onPick={pickMatch}
            onManual={startManual}
          />
        ) : (
          <>
            {fromMatch && match ? (
              <section className="relative overflow-hidden rounded-xl border border-white/5 bg-white/[0.02] p-3 pl-4">
                <span className="absolute inset-y-0 left-0 w-1 bg-primary" aria-hidden />
                <div className="flex items-center gap-3">
                  <TeamCrest path={match.rival?.crest_path ?? null} name={match.rival?.name ?? "Rival"} className="h-10 w-10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {match.isHome ? "vs " : "Visita a "}
                      {match.rival?.name ?? "Por definir"}
                    </p>
                    <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                      <Info className="h-3 w-3" /> Partido: {longDate(match.kickoff_at)}
                      {match.venue ? ` · ${match.venue}` : ""} (referencia)
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setStep("pick")}>
                    Cambiar
                  </Button>
                </div>
              </section>
            ) : null}

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
            </FormSection>

            <FormSection
              title="Fechas del viaje"
              icon={CalendarClock}
              hint="Solo días. Las horas viven en el transporte, los vuelos y la citación."
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="trip-departure">Salida</Label>
                  <Input
                    id="trip-departure"
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                  />
                  {fromMatch && match?.kickoff_at ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        { label: "Día del partido", days: 0 },
                        { label: "1 día antes", days: -1 },
                        { label: "2 días antes", days: -2 },
                      ].map((opt) => {
                        const value = shiftDate(toDateInput(match.kickoff_at), opt.days);
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => setDepartureDate(value)}
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                              departureDate === value
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="trip-return">Regreso (opcional)</Label>
                  <Input
                    id="trip-return"
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                  />
                  {fromMatch && match?.kickoff_at ? (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {[
                        { label: "Mismo día", days: 0 },
                        { label: "1 día después", days: 1 },
                      ].map((opt) => {
                        const value = shiftDate(toDateInput(match.kickoff_at), opt.days);
                        return (
                          <button
                            key={opt.label}
                            type="button"
                            onClick={() => setReturnDate(value)}
                            className={cn(
                              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                              returnDate === value
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border/60 text-muted-foreground hover:bg-white/[0.04]",
                            )}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            </FormSection>

            {fromMatch ? (
              <>
                <FormSection
                  title={`Jugadores convocados (${playerIds.size})`}
                  icon={Users}
                  hint="Vienen de la convocatoria del partido. Quita a quien no viaje."
                >
                  {callupsQ.isLoading ? (
                    <p className="text-sm text-muted-foreground">Cargando convocatoria…</p>
                  ) : playerIds.size === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/60 p-4 text-center">
                      <Users className="mx-auto h-5 w-5 text-muted-foreground/60" />
                      <p className="mt-2 text-sm text-muted-foreground">
                        Este partido aún no tiene convocatoria.
                      </p>
                      <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => setStaffOpen(true)}>
                        Elegir personas a mano
                      </Button>
                    </div>
                  ) : (
                    <ul className="space-y-1.5">
                      {[...playerIds].map((uid) => {
                        const info = callupById.get(uid);
                        const member = memberById.get(uid);
                        return (
                          <PersonRow
                            key={uid}
                            name={info?.name ?? member?.full_name ?? "Jugador"}
                            subtitle={member?.job_title ?? "Jugador"}
                            avatarUrl={info?.avatar ?? member?.avatar_url ?? null}
                            onRemove={() =>
                              setPlayerIds((prev) => {
                                const next = new Set(prev);
                                next.delete(uid);
                                return next;
                              })
                            }
                          />
                        );
                      })}
                    </ul>
                  )}
                </FormSection>

                <FormSection
                  title={`Staff y acompañantes (${staffIds.size})`}
                  icon={UserPlus}
                  hint="Cuerpo técnico, médico, utilería y directivos que viajan con el equipo."
                >
                  {staffIds.size > 0 ? (
                    <ul className="space-y-1.5">
                      {[...staffIds].map((uid) => {
                        const member = memberById.get(uid);
                        return (
                          <PersonRow
                            key={uid}
                            name={member?.full_name ?? member?.email ?? "Miembro"}
                            subtitle={[member?.role_name, member?.job_title].filter(Boolean).join(" · ") || null}
                            avatarUrl={member?.avatar_url ?? null}
                            onRemove={() =>
                              setStaffIds((prev) => {
                                const next = new Set(prev);
                                next.delete(uid);
                                return next;
                              })
                            }
                          />
                        );
                      })}
                    </ul>
                  ) : !staffOpen ? (
                    <p className="text-sm text-muted-foreground">Nadie más agregado todavía.</p>
                  ) : null}

                  {staffOpen ? (
                    teamId ? (
                      <TravelerPicker
                        clubId={clubId}
                        teamId={teamId}
                        selectedIds={new Set([...playerIds, ...staffIds])}
                        onToggle={(m) => {
                          if (playerIds.has(m.id)) return;
                          setStaffIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(m.id)) next.delete(m.id);
                            else next.add(m.id);
                            return next;
                          });
                        }}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">Selecciona una categoría primero.</p>
                    )
                  ) : (
                    <Button type="button" variant="outline" size="sm" onClick={() => setStaffOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" /> Agregar personas
                    </Button>
                  )}
                </FormSection>

                <p className="px-1 text-xs text-muted-foreground">
                  Viajan {playerIds.size} jugadores + {staffIds.size} staff · {totalTravelers} en total
                </p>
              </>
            ) : (
              <FormSection
                title="Convocados"
                icon={Users}
                hint="Por defecto va toda la categoría; puedes personalizarla."
              >
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
            )}

            {isEdit ? (
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
            ) : null}

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
          </>
        )}
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
        {step === "form" ? (
          <Button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="glow-primary"
          >
            {mutation.isPending ? "Guardando…" : isEdit ? "Guardar cambios" : "Crear viaje"}
          </Button>
        ) : null}
      </EntitySheetFooter>
    </EntitySheet>
  );
}
