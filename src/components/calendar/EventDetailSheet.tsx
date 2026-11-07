import * as React from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ClipboardList, Clock, ListChecks, Lock, MapPin, Plane, Shirt, StickyNote, Target, Ticket, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useApp } from "@/components/squad/AppLayout";
import type { CalendarEventRow } from "@/hooks/useCalendarEvents";
import type { TeamOption } from "@/hooks/useAccess";
import { useSessionByEvent } from "@/hooks/useTraining";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { useMatchByEvent, useMatchCallups, useMatchLogistics } from "@/hooks/useMatchOps";
import { meetingsQueryOptions } from "@/hooks/useCoordinacion";
import { tripsQueryOptions } from "@/hooks/useTrips";
import { EVENT_TYPE_MAP } from "@/lib/eventTypes";
import { agendaKind, rowTime, tripMoments } from "@/lib/agenda";
import { getClubTimeZone } from "@/lib/calendar-utils";
import { isPlayerVisible } from "@/lib/viajes";
import { TeamCrest } from "@/components/match/TeamCrest";
import { useCrestTeam } from "@/components/agenda/AgendaCards";
import { DirectionsButton, EventSheet, PersonalBlock, PlaceRow, SheetRow, SheetRows, primaryBtn, secondaryBtn, useSheetPlace } from "@/components/agenda/EventSheet";
import { SessionFormDialog } from "@/components/entrenamientos/SessionFormDialog";
import { EventFormDialog } from "./EventFormDialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  event: CalendarEventRow | null;
  canEdit: boolean;
  clubId: string | null;
  userId: string;
  teams: TeamOption[];
  teamName?: (id: string | null) => string | null;
  /** Viaje: qué momento se tocó (ida o regreso). */
  tripLeg?: "ida" | "regreso";
}

const tz = () => getClubTimeZone();
const hm = (iso: string) => { const t = rowTime({ starts_at: iso, event_type: "evento" }, tz())!; return `${t.time} ${t.ampm}`; };
const dayShort = (iso: string) => new Intl.DateTimeFormat("es-MX", { timeZone: tz(), weekday: "short", day: "numeric", month: "short" }).format(new Date(iso)).replace(/\./g, "").replace(" de ", " ").replace(/^./, (c) => c.toUpperCase());
const dayLong = (iso: string) => new Intl.DateTimeFormat("es-MX", { timeZone: tz(), weekday: "long", day: "numeric", month: "long" }).format(new Date(iso)).replace(",", "").replace(/^./, (c) => c.toUpperCase());
const when = (e: { starts_at: string; ends_at: string | null }) => `${dayShort(e.starts_at)} · ${hm(e.starts_at)}${e.ends_at ? ` – ${hm(e.ends_at)}` : ""}`;

/**
 * Hoja de detalle de un evento (Agenda e Inicio): encabezado por tipo,
 * bloque personal, filas de información y hasta dos acciones.
 * Las citas médicas solo muestran lo genérico.
 */
export function EventDetailSheet({ open, onOpenChange, event, canEdit, clubId, userId, teams, teamName, tripLeg }: Props) {
  const navigate = useNavigate();
  const { isPlayerOnly } = useApp();
  const qc = useQueryClient();
  const kind = event ? agendaKind(event) : "evento";
  const isMedical = event?.event_type === "medico";
  const isMatch = kind === "partido";
  const isTraining = kind === "entrenamiento";

  const sessionQ = useSessionByEvent(open && isTraining ? event!.id : null);
  const session = sessionQ.data ?? null;
  const matchQ = useMatchByEvent(open && isMatch ? event!.id : null);
  const match = matchQ.data ?? null;
  const callupsQ = useMatchCallups(match ? [match.id] : []);
  const logistics = (useMatchLogistics(match ? [match.id] : []).data ?? [])[0] ?? null;
  // Solo lectura de caché/consulta: el aviso en vivo ya lo tiene la pantalla que abre la hoja.
  const meetings = useQuery({ ...meetingsQueryOptions(clubId), enabled: open && !!event?.meeting_id && !!clubId }).data;
  const meeting = event?.meeting_id ? meetings?.find((m) => m.id === event.meeting_id) ?? null : null;
  const trips = useQuery({ ...tripsQueryOptions(clubId, null), enabled: open && !!clubId }).data;
  const trip = event?.trip_id ? trips?.find((t) => t.id === event.trip_id) ?? null : null;
  const matchTrip = isMatch && event ? trips?.find((t) => t.match_event_id === event.id && isPlayerVisible(t) && t.travelers.some((x) => x.user_id === userId)) ?? null : null;

  const tripExtra = useQuery({
    queryKey: ["sheet-trip", trip?.id ?? "none", userId],
    enabled: open && !!trip,
    queryFn: async () => {
      const [fl, occ, tp] = await Promise.all([
        supabase.from("trip_flights").select("id, trip_id, leg, origin, destination, departs_at, arrives_at, flight_code").eq("trip_id", trip!.id),
        supabase.from("trip_room_occupants").select("room_id, room:trip_rooms(room_label, hotel:trip_hotels(name, trip_id))").eq("user_id", userId),
        supabase.from("trip_transport_passengers").select("transport:trip_transports(trip_id, leg, label, transport_type, departs_at, pickup_location, destination)").eq("user_id", userId),
      ]);
      const flights = (fl.data ?? []) as any[];
      const ids = flights.map((f) => f.id);
      const passes = ids.length ? (await supabase.from("trip_boarding_passes").select("flight_id").in("flight_id", ids).eq("user_id", userId)).data ?? [] : [];
      const room = ((occ.data ?? []) as any[]).find((o) => o.room?.hotel?.trip_id === trip!.id) ?? null;
      let mates: string[] = [];
      if (room) {
        const { data } = await supabase.from("trip_room_occupants").select("user_id, profile:profiles!trip_room_occupants_user_id_fkey(full_name)").eq("room_id", room.room_id).neq("user_id", userId);
        mates = ((data ?? []) as any[]).map((r) => r.profile?.full_name).filter(Boolean);
      }
      const transports = ((tp.data ?? []) as any[]).map((r) => r.transport).filter((t) => t?.trip_id === trip!.id);
      return { flights, passFlights: new Set(passes.map((p: any) => p.flight_id)), room: room ? { label: room.room.room_label as string, hotel: room.room.hotel?.name as string, mates } : null, transports };
    },
  });

  const { canEditTeam } = useTeamAccess("entrenamientos");
  const [planForm, setPlanForm] = React.useState<null | "new" | "edit">(null);
  const [editing, setEditing] = React.useState(false);
  React.useEffect(() => { if (!open) { setPlanForm(null); setEditing(false); } }, [open]);

  const place = useSheetPlace(
    isMatch ? match?.location_id ?? event?.location_id : meeting ? meeting.location_id ?? event?.location_id : event?.location_id,
    isMatch ? match?.venue ?? event?.location : meeting?.location ?? event?.location,
  );

  if (!event) return null;
  const def = EVENT_TYPE_MAP[event.event_type];
  const team = teamName?.(event.team_id) ?? null;
  const editableGeneric = canEdit && !isMedical && !isMatch && !event.trip_id && !event.meeting_id && !!clubId;
  const canEditPlan = isTraining && !!clubId && canEditTeam(event.team_id);
  const onEdit = isTraining && canEditPlan ? () => setPlanForm(session ? "edit" : "new") : editableGeneric ? () => setEditing(true) : null;

  let header: React.ReactNode;
  let personal: React.ReactNode = null;
  const rows: React.ReactNode[] = [];
  let actions: React.ReactNode = null;
  // Descripciones autogeneradas ("Jornada 11") ya están en el encabezado.
  const notes = event.description && !isMedical && !/^jornada \d+$/i.test(event.description.trim()) ? <SheetRow key="notes" icon={StickyNote} main={event.description} /> : null;

  if (isMatch) {
    const callups = callupsQ.data ?? [];
    const mine = callups.some((c) => c.user_id === userId);
    const status = callups.length === 0 ? "Convocatoria pendiente" : mine ? "Convocado" : "No convocado";
    header = <MatchHeader event={event} match={match} team={team} />;
    if (mine || isPlayerOnly) {
      personal = logistics?.call_time_at && mine
        ? <PersonalBlock label="Tu citación" main={hm(logistics.call_time_at)} sub={logistics.meeting_point} status={status} />
        : <PersonalBlock label="Tu convocatoria" status={status} />;
    }
    if (place) rows.push(<PlaceRow key="p" place={place} />);
    if (logistics?.kit) rows.push(<SheetRow key="k" icon={Shirt} main={logistics.kit} sub="Uniforme" />);
    if (logistics?.logistics_notes) rows.push(<SheetRow key="ln" icon={StickyNote} main={logistics.logistics_notes} />);
    else if (notes) rows.push(notes);
    actions = <>
      {place ? <DirectionsButton place={place} /> : null}
      {matchTrip ? <button type="button" className={place ? secondaryBtn : primaryBtn} onClick={() => navigate({ to: "/agenda-viajes", search: { open: matchTrip.id } as any })}><Plane className="h-4 w-4" /> Mi viaje</button> : null}
    </>;
  } else if (event.trip_id) {
    const flights = tripExtra.data?.flights ?? [];
    const moments = trip ? tripMoments(trip, flights) : [];
    const moment = moments.find((m) => m.leg === tripLeg) ?? moments[0] ?? null;
    header = <TripHeader title={trip?.title ?? event.title} moment={moment} origin={trip?.meeting_point ?? null} destination={trip?.destination ?? null} leg={moment?.leg ?? "ida"} />;
    const x = tripExtra.data;
    if (x?.room || x?.transports.length) {
      const tr = x.transports.find((t: any) => t.leg === (moment?.leg ?? "ida")) ?? x.transports[0];
      personal = <PersonalBlock label="Tu viaje"
        main={x.room ? `${x.room.label}${x.room.hotel ? ` · ${x.room.hotel}` : ""}` : null}
        sub={[x.room?.mates.length ? `Con ${x.room.mates.join(", ")}` : null, tr ? `${tr.label || "Transporte"} · ${hm(tr.departs_at)}` : null].filter(Boolean).join(" · ") || null} />;
    }
    if (trip?.meeting_at || trip?.meeting_point) rows.push(<SheetRow key="m" icon={Clock} main={trip.meeting_at ? `${dayShort(trip.meeting_at)} · ${hm(trip.meeting_at)}` : "Reunión"} sub={trip.meeting_point ? `Reunión en ${trip.meeting_point}` : "Reunión"} />);
    if (moment?.flight) rows.push(<SheetRow key="f" icon={Plane} main={`Vuelo ${moment.flight.flight_code}`} sub="Horario y ruta arriba" />);
    const hasPass = !!moment?.flight && !!x?.passFlights.has(moment.flight.id);
    const go = () => trip && navigate({ to: "/agenda-viajes", search: { open: trip.id } as any });
    actions = <>
      {hasPass ? <button type="button" className={primaryBtn} onClick={go}><Ticket className="h-4 w-4" /> Mi pase</button> : null}
      <button type="button" className={hasPass ? secondaryBtn : primaryBtn} onClick={go}>Ver viaje completo</button>
    </>;
  } else if (event.meeting_id) {
    header = <IconHeader icon={Users} title={meeting?.title ?? event.title} sub={when(meeting ?? event)} />;
    const mine = meeting?.attendees.find((a) => a.user_id === userId);
    const label: Record<string, string> = { confirmado: "Asistirás", rechazado: "No asistirás", invitado: "Sin responder" };
    if (mine) personal = <PersonalBlock label="Tu respuesta" status={label[mine.attendance_status] ?? "Sin responder"} />;
    if (place) rows.push(<PlaceRow key="p" place={place} />);
    const points = (meeting?.agenda ?? "").split("\n").map((l) => l.replace(/^[☐☑]\s*/, "").trim()).filter(Boolean);
    if (points.length) rows.push(<SheetRow key="a" icon={ListChecks} main={points.map((p, i) => `${i + 1}. ${p}`).join("\n")} sub="Orden del día" />);
    if (meeting?.attendees.length) {
      const ok = meeting.attendees.filter((a) => a.attendance_status === "confirmado").length;
      rows.push(<SheetRow key="i" icon={Users} main={`${ok} de ${meeting.attendees.length} confirmaron`}>
        <div className="mt-2 flex -space-x-2">{meeting.attendees.slice(0, 8).map((a) => <Avatar key={a.user_id} name={a.profile?.full_name ?? ""} url={a.profile?.avatar_url ?? null} />)}</div>
      </SheetRow>);
    }
    if (meeting?.notes && meeting.status === "finalizada") rows.push(<SheetRow key="n" icon={StickyNote} main={meeting.notes} sub="Minuta" />);
    const respond = async (s: "confirmado" | "rechazado") => {
      const { error } = await supabase.from("meeting_attendees").update({ attendance_status: s }).eq("meeting_id", meeting!.id).eq("user_id", userId);
      if (error) return toast.error(error.message);
      toast.success(s === "confirmado" ? "Confirmaste tu asistencia" : "Avisaste que no asistirás");
      qc.invalidateQueries({ queryKey: ["coord-meetings", clubId] });
    };
    const future = new Date(event.starts_at) > new Date();
    const openMeeting = () => navigate({ to: "/coordinacion/general/juntas/$meetingId", params: { meetingId: event.meeting_id! } });
    actions = mine && future
      ? mine.attendance_status === "invitado"
        ? <><button type="button" className={primaryBtn} onClick={() => respond("confirmado")}>Asistiré</button><button type="button" className={secondaryBtn} onClick={() => respond("rechazado")}>No asistiré</button></>
        : <><button type="button" className={primaryBtn} onClick={() => respond(mine.attendance_status === "confirmado" ? "rechazado" : "confirmado")}>Cambiar respuesta</button><button type="button" className={secondaryBtn} onClick={openMeeting}>Abrir junta</button></>
      : <button type="button" className={primaryBtn} onClick={openMeeting}>Abrir junta</button>;
  } else {
    header = <IconHeader icon={def.icon} title={event.title} sub={`${when(event)}${team ? ` · ${team}` : ""}`} />;
    if (isMedical) rows.push(<SheetRow key="priv" icon={Lock} main="Cita privada" sub="El motivo y las notas clínicas solo se consultan en Salud." />);
    if (place) rows.push(<PlaceRow key="p" place={place} />);
    if (isTraining && session && (session.objective || session.title)) rows.push(<SheetRow key="s" icon={Target} main={session.objective || session.title} sub="Enfoque de la sesión" />);
    if (isTraining && session?.notes) rows.push(<SheetRow key="sn" icon={ClipboardList} main={session.notes} sub="Plan" />);
    if (notes) rows.push(notes);
    actions = place ? <DirectionsButton place={place} /> : null;
  }

  return (
    <>
      <EventSheet open={open && !editing && !planForm} onOpenChange={onOpenChange} title={event.title} onEdit={onEdit} actions={actions}>
        {header}
        {personal}
        {rows.length ? <SheetRows>{rows}</SheetRows> : null}
      </EventSheet>
      {editing && clubId ? <EventFormDialog open onOpenChange={(v) => !v && setEditing(false)} clubId={clubId} teams={teams} userId={userId} event={event} /> : null}
      {planForm && clubId ? (
        <SessionFormDialog open onOpenChange={(v) => !v && setPlanForm(null)} clubId={clubId} userId={userId} teams={teams} defaultTeamId={event.team_id} defaultEventId={event.id} session={planForm === "edit" ? session : null} />
      ) : null}
    </>
  );
}

function Avatar({ name, url }: { name: string; url: string | null }) {
  const ini = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";
  return url
    ? <img src={url} alt={name} className="h-8 w-8 rounded-full border-2 border-card object-cover" />
    : <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-bold">{ini}</span>;
}

function IconHeader({ icon: Icon, title, sub }: { icon: typeof MapPin; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-muted"><Icon className="h-7 w-7" /></span>
      <div className="min-w-0">
        <h2 className="text-lg font-bold leading-tight">{title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">{sub}</p>
      </div>
    </div>
  );
}

function MatchHeader({ event, match, team }: { event: CalendarEventRow; match: ReturnType<typeof useMatchByEvent>["data"]; team: string | null }) {
  const home = useCrestTeam(match?.home ?? null);
  const away = useCrestTeam(match?.away ?? null);
  const t = rowTime({ starts_at: event.starts_at, event_type: "evento" }, tz())!;
  const tag = [match?.tournament_name, match?.matchday ? `Jornada ${match.matchday}` : null, match ? (match.isHome ? "Local" : "Visita") : null].filter(Boolean).join(" · ");
  const played = match?.status === "jugado" && match.home_goals != null && match.away_goals != null;
  return (
    <div className="pt-1 text-center">
      {tag ? <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{tag}</p> : null}
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex flex-col items-center gap-1.5"><TeamCrest team={home} size="lg" className="h-16 w-16" /><span className="line-clamp-1 text-xs font-semibold">{home.shortName}</span></div>
        <div>
          {played ? <p className="text-3xl font-bold tabular-nums">{match!.home_goals} - {match!.away_goals}</p> : <p><span className="text-3xl font-bold">{t.time}</span><span className="ml-0.5 text-xs font-semibold text-muted-foreground">{t.ampm}</span></p>}
          <p className="mt-1 text-xs text-muted-foreground">{dayLong(event.starts_at)}</p>
        </div>
        <div className="flex flex-col items-center gap-1.5"><TeamCrest team={away} size="lg" className="h-16 w-16" /><span className="line-clamp-1 text-xs font-semibold">{away.shortName}</span></div>
      </div>
      {!match ? <p className="mt-2 font-semibold">{event.title}</p> : null}
      {team ? <p className="mt-2 text-xs text-muted-foreground">{team}</p> : null}
    </div>
  );
}

function TripHeader({ title, moment, origin, destination, leg }: { title: string; moment: ReturnType<typeof tripMoments>[number] | null; origin: string | null; destination: string | null; leg: "ida" | "regreso" }) {
  const f = moment?.flight ?? null;
  const from = f?.origin ?? (leg === "ida" ? origin : destination) ?? "Salida";
  const to = f?.destination ?? (leg === "ida" ? destination : origin) ?? "Destino";
  return (
    <div className="pt-1">
      <p className="text-center text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{leg === "ida" ? "Viaje · Ida" : "Viaje · Regreso"}</p>
      <p className="mt-1 text-center text-sm font-semibold">{title}</p>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-[16px] bg-card px-4 py-3">
        <div><p className="truncate text-2xl font-bold">{from}</p>{moment ? <p className="text-xs text-muted-foreground">{hm(f?.departs_at ?? moment.at)}</p> : null}</div>
        <Plane className="h-5 w-5 text-muted-foreground" />
        <div className="text-right"><p className="truncate text-2xl font-bold">{to}</p>{f?.arrives_at ? <p className="text-xs text-muted-foreground">{hm(f.arrives_at)}</p> : null}</div>
      </div>
      {moment ? <p className="mt-2 text-center text-xs text-muted-foreground">{dayLong(moment.at)}</p> : null}
    </div>
  );
}
