import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AgendaSkeleton } from "@/components/squad/LoadingState";
import { useApp } from "@/components/squad/AppLayout";
import { useTeamFilter } from "@/hooks/useTeamFilter";
import { useCalendarEvents, type CalendarEventRow } from "@/hooks/useCalendarEvents";
import { useEditableTeams } from "@/hooks/useEditableTeams";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { useTrips } from "@/hooks/useTrips";
import { useOurMatches, useMatchCallups, type OurMatch } from "@/hooks/useMatchOps";
import { useMeetings } from "@/hooks/useCoordinacion";
import { EventDetailSheet } from "@/components/calendar/EventDetailSheet";
import { AgendaHeader } from "@/components/agenda/AgendaHeader";
import { MatchCard, SimpleCard, TripCard } from "@/components/agenda/AgendaCards";
import { WeekStrip } from "@/components/agenda/WeekStrip";
import { agendaDayKey, agendaKind, filterAgenda, groupByDay, hasMoreAfter, tripMoments, type AgendaKind, type TripMoment } from "@/lib/agenda";
import { buildEventContext } from "@/lib/eventContext";
import { formatRelativeDayLabel } from "@/lib/calendar-utils";
import { isPlayerVisible } from "@/lib/viajes";

export const Route = createFileRoute("/_authenticated/m/agenda")({
  head: () => ({
    meta: [
      { title: "Squad — Agenda" },
      { name: "description", content: "Lo próximo para ti: partidos, entrenamientos, viajes, juntas y eventos." },
      { property: "og:title", content: "Squad — Agenda" },
      { property: "og:description", content: "Tu agenda: el evento más importante que viene y los próximos días." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgendaProximoPage,
});

const longDay = new Intl.DateTimeFormat("es-MX", { weekday: "long", day: "numeric" });
const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1);
const dayFmt = new Intl.DateTimeFormat("es-MX", { weekday: "short", day: "numeric", month: "short" });

function AgendaProximoPage() {
  const { user, profile, teamOptions, isPlayerOnly } = useApp();
  const clubId = profile?.club_id ?? null;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const editableTeams = useEditableTeams("agenda");
  const { canEditRecord } = useTeamAccess("agenda");
  const [category, setCategory] = useTeamFilter();
  const [kinds, setKinds] = React.useState<AgendaKind[]>([]);
  const [days, setDays] = React.useState(14);
  const [detailEvent, setDetailEvent] = React.useState<CalendarEventRow | null>(null);

  const { data: events, isLoading } = useCalendarEvents({ mode: "club", clubId });
  const tripsQ = useTrips(clubId, null);
  const matchesQ = useOurMatches(clubId);
  const meetingsQ = useMeetings(clubId);

  const myTeamIds = React.useMemo(() => teamOptions.map((t) => t.id).filter(Boolean) as string[], [teamOptions]);
  const teamNames = React.useMemo(() => Object.fromEntries(teamOptions.filter((t) => t.id).map((t) => [t.id as string, t.name])), [teamOptions]);

  const tripById = React.useMemo(() => new Map((tripsQ.data ?? []).map((t) => [t.id, t])), [tripsQ.data]);
  const matchByEvent = React.useMemo(() => {
    const m = new Map<string, OurMatch>();
    for (const x of matchesQ.data ?? []) if (x.calendar_event_id) m.set(x.calendar_event_id, x);
    return m;
  }, [matchesQ.data]);
  const meetingById = React.useMemo(() => new Map((meetingsQ.data ?? []).map((m) => [m.id, m])), [meetingsQ.data]);

  const isMyTrip = React.useCallback(
    (tripId: string | null | undefined) => {
      const t = tripId ? tripById.get(tripId) : null;
      return !!t && isPlayerVisible(t) && t.travelers.some((x) => x.user_id === user.id);
    },
    [tripById, user.id],
  );

  const visible = React.useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // Viajes en curso siguen visibles hasta su regreso.
    const future = (events ?? []).filter((e) => new Date(e.ends_at ?? e.starts_at) >= today || new Date(e.starts_at) >= today);
    return filterAgenda(future, myTeamIds, category, kinds);
  }, [events, myTeamIds, category, kinds]);

  const myTripIds = React.useMemo(() => [...new Set(visible.map((e) => e.trip_id).filter((id): id is string => !!id && isMyTrip(id)))], [visible, isMyTrip]);
  const flightsQ = useQuery({
    queryKey: ["agenda-trip-flights", myTripIds.join(","), user.id],
    enabled: myTripIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("trip_flights").select("id, trip_id, leg, origin, destination, departs_at, arrives_at, flight_code").in("trip_id", myTripIds);
      if (error) throw error;
      const ids = (data ?? []).map((f) => f.id);
      const { data: passes } = ids.length
        ? await supabase.from("trip_boarding_passes").select("flight_id").in("flight_id", ids).eq("user_id", user.id)
        : { data: [] as { flight_id: string }[] };
      return { flights: data ?? [], passFlights: new Set((passes ?? []).map((p) => p.flight_id)) };
    },
  });

  /** Lista final: los eventos de viaje se convierten en sus momentos (ida/regreso). */
  type Item = { id: string; starts_at: string; event_type: string; team_id: string | null; trip_id?: string | null; event: CalendarEventRow; moment?: TripMoment };
  const items = React.useMemo(() => {
    const out: Item[] = [];
    const seenTrips = new Set<string>();
    for (const e of visible) {
      if (e.trip_id) {
        if (!isMyTrip(e.trip_id) || seenTrips.has(e.trip_id)) continue;
        seenTrips.add(e.trip_id);
        const trip = tripById.get(e.trip_id)!;
        const fl = (flightsQ.data?.flights ?? []).filter((f) => f.trip_id === trip.id);
        for (const m of tripMoments(trip, fl)) out.push({ id: m.key, starts_at: m.at, event_type: "viaje", team_id: e.team_id, trip_id: e.trip_id, event: e, moment: m });
      } else out.push({ id: e.id, starts_at: e.starts_at, event_type: e.event_type, team_id: e.team_id, event: e });
    }
    return out;
  }, [visible, isMyTrip, tripById, flightsQ.data]);

  const groups = React.useMemo(() => groupByDay(items, days), [items, days]);
  const more = hasMoreAfter(items, days);
  const [selected, setSelected] = React.useState<Date | null>(null);
  const goTo = (d: Date) => {
    setSelected(d);
    const target = groups.find((g) => g.date >= new Date(d.getFullYear(), d.getMonth(), d.getDate()));
    if (target) document.getElementById(`dia-${agendaDayKey(target.date)}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const matchIds = React.useMemo(() => (isPlayerOnly ? [...matchByEvent.values()].map((m) => m.id) : []), [isPlayerOnly, matchByEvent]);
  const callupsQ = useMatchCallups(matchIds);
  const callupFor = (m: OurMatch | null) => {
    if (!m || !isPlayerOnly || !callupsQ.data) return null;
    const rows = callupsQ.data.filter((c) => c.match_id === m.id);
    return rows.length === 0 ? "Convocatoria pendiente" : rows.some((c) => c.user_id === user.id) ? "Convocado" : "No convocado";
  };

  const openTrip = (id: string) => navigate({ to: "/agenda-viajes", search: { open: id } });
  const open = (e: CalendarEventRow) => {
    if (e.trip_id) return openTrip(e.trip_id);
    if (e.meeting_id) return navigate({ to: "/coordinacion/general/juntas/$meetingId", params: { meetingId: e.meeting_id } });
    setDetailEvent(e);
  };

  async function respond(meetingId: string, status: "confirmado" | "rechazado") {
    const { error } = await supabase.from("meeting_attendees").update({ attendance_status: status }).eq("meeting_id", meetingId).eq("user_id", user.id);
    if (error) return toast.error(error.message);
    toast.success(status === "confirmado" ? "Confirmaste tu asistencia" : "Avisaste que no asistirás");
    qc.invalidateQueries({ queryKey: ["coord-meetings", clubId] });
  }

  const contextFor = (e: CalendarEventRow): string | null => {
    const trip = e.trip_id ? tripById.get(e.trip_id) : null;
    if (trip) {
      const back = trip.return_at ? `regresa ${dayFmt.format(new Date(trip.return_at)).replace(/\./g, "")}` : null;
      return [trip.meeting_point ? `Salida de ${trip.meeting_point}` : trip.destination, back].filter(Boolean).join(" · ") || null;
    }
    const m = matchByEvent.get(e.id);
    if (m) return [m.matchday ? `Jornada ${m.matchday}` : null, m.venue || e.location].filter(Boolean).join(" · ") || null;
    return buildEventContext(e);
  };

  return (
    <div className="space-y-5">
      <AgendaHeader tab="proximo" category={category} onCategory={setCategory} kinds={kinds} onKinds={setKinds} />

      {isLoading && !events ? (
        <AgendaSkeleton count={4} />
      ) : (
        <>
          <WeekStrip events={items} selected={selected} onSelect={goTo} />

          {groups.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nada en tu agenda estos días</p>
          ) : (
            groups.map((g) => {
              const rel = formatRelativeDayLabel(g.date);
              const extra = rel === "HOY" ? " · Hoy" : rel === "MAÑANA" ? " · Mañana" : "";
              return (
                <section key={g.date.toISOString()} id={`dia-${agendaDayKey(g.date)}`} className="scroll-mt-4 space-y-2">
                  <h2 className="px-1 text-xs font-semibold text-muted-foreground">{cap(longDay.format(g.date))}{extra}</h2>
                  {g.events.map((it) => {
                    const e = it.event;
                    if (it.moment) {
                      const trip = tripById.get(it.trip_id!)!;
                      const hasPass = !!it.moment.flight && !!flightsQ.data?.passFlights.has(it.moment.flight.id);
                      return <TripCard key={it.id} trip={trip} moment={it.moment} hasPass={hasPass} onOpen={() => openTrip(trip.id)} />;
                    }
                    if (agendaKind(e) === "partido") {
                      const m = matchByEvent.get(e.id) ?? null;
                      return <MatchCard key={it.id} event={e} match={m} callup={callupFor(m)} onOpen={() => open(e)} />;
                    }
                    const meeting = e.meeting_id ? meetingById.get(e.meeting_id) : null;
                    const mine = meeting?.attendees.find((a) => a.user_id === user.id);
                    return (
                      <SimpleCard
                        key={it.id}
                        event={e}
                        context={contextFor(e)}
                        rsvp={meeting && mine && new Date(e.starts_at) > new Date() ? { status: mine.attendance_status, onRespond: (s) => respond(meeting.id, s) } : null}
                        onOpen={() => open(e)}
                      />
                    );
                  })}
                </section>
              );
            })
          )}

          {more ? (
            <button type="button" onClick={() => setDays((d) => d + 14)} className="w-full py-3 text-sm font-semibold text-primary">
              Ver más
            </button>
          ) : null}
        </>
      )}

      <EventDetailSheet
        open={!!detailEvent}
        onOpenChange={(v) => !v && setDetailEvent(null)}
        event={detailEvent}
        canEdit={!!detailEvent && canEditRecord(detailEvent.team_id)}
        clubId={clubId}
        userId={user.id}
        teams={editableTeams}
        teamName={(id) => (id ? teamNames[id] ?? null : "Todo el club")}
      />
    </div>
  );
}
