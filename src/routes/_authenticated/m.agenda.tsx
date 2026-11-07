import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AgendaSkeleton } from "@/components/squad/LoadingState";
import { useApp } from "@/components/squad/AppLayout";
import { useTeamFilter } from "@/hooks/useTeamFilter";
import { calendarRangeQueryOptions, useCalendarLive, useCalendarMonths, useCalendarRange, useNextEventAfter, type CalendarEventRow } from "@/hooks/useCalendarEvents";
import { useEditableTeams } from "@/hooks/useEditableTeams";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import { useTrips } from "@/hooks/useTrips";
import { useOurMatches, useMatchCallups, type OurMatch } from "@/hooks/useMatchOps";
import { useMeetings } from "@/hooks/useCoordinacion";
import { FlightPassViewer, type PassTarget } from "@/components/viajes/mine/PassViewer";
import { EventDetailSheet } from "@/components/calendar/EventDetailSheet";
import { AgendaHeader } from "@/components/agenda/AgendaHeader";
import { MatchCard, SimpleCard, TripCard } from "@/components/agenda/AgendaCards";
import { LoadMore, MonthGrid, PastToggle, ViewSwitch, WeekStrip, dayTitle, longDay, monthTitle, shortDay } from "@/components/agenda/AgendaViews";
import { addDays, addMonthsTo, agendaDayKey, agendaKind, filterAgenda, groupByMonthDay, inRange, monthGridDays, monthStart, parseDayKey, sameDay, tripMoments, weekRange, type AgendaKind, type AgendaView, type TripMoment } from "@/lib/agenda";
import { buildEventContext } from "@/lib/eventContext";
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
  validateSearch: (s: Record<string, unknown>): { vista?: string; fecha?: string; dia?: string; pasados?: boolean } => ({
    vista: typeof s.vista === "string" ? s.vista : undefined,
    fecha: typeof s.fecha === "string" ? s.fecha : undefined,
    dia: typeof s.dia === "string" ? s.dia : undefined,
    pasados: s.pasados === true || s.pasados === "true" ? true : undefined,
  }),
  component: AgendaProximoPage,
});

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
  const search = Route.useSearch();
  const view: AgendaView = search.vista === "mes" || search.vista === "lista" ? search.vista : "semana";
  const todayKey = agendaDayKey(new Date());
  const today = parseDayKey(todayKey)!;
  const fecha = parseDayKey(search.fecha) ?? today;
  const dia = parseDayKey(search.dia);
  const [passTarget, setPassTarget] = React.useState<PassTarget | null>(null);
  const setSearch = (next: Partial<typeof search>) => navigate({ to: "/m/agenda", search: (prev: typeof search) => ({ ...prev, ...next }) as any });
  const [detailEvent, setDetailEvent] = React.useState<CalendarEventRow | null>(null);

  useCalendarLive(clubId);
  const week = weekRange(fecha);
  const grid = monthGridDays(fecha);
  const range = view === "mes" ? grid : week;
  const rangeQ = useCalendarRange(view === "lista" ? null : clubId, range.from, range.to);
  // Semana: precarga la anterior y la siguiente.
  React.useEffect(() => {
    if (view !== "semana" || !clubId) return;
    for (const n of [-7, 7]) qc.prefetchQuery(calendarRangeQueryOptions(clubId, addDays(week.from, n), addDays(week.to, n)));
  }, [view, clubId, week.from.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps
  const fwdQ = useCalendarMonths(view === "lista" ? clubId : null, today, "forward");
  const backQ = useCalendarMonths(view === "lista" && search.pasados ? clubId : null, today, "back");
  const events = React.useMemo(() => {
    if (view !== "lista") return rangeQ.data;
    if (!fwdQ.data) return undefined;
    const all = [...fwdQ.data.pages.flat(), ...(backQ.data?.pages.flat() ?? [])];
    return [...new Map(all.map((e) => [e.id, e])).values()];
  }, [view, rangeQ.data, fwdQ.data, backQ.data]);
  const isLoading = view === "lista" ? fwdQ.isLoading : rangeQ.isLoading;
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

  const visible = React.useMemo(() => filterAgenda(events ?? [], myTeamIds, category, kinds), [events, myTeamIds, category, kinds]);

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

  const weekAll = !dia || dia < week.from || dia >= week.to;
  const weekItems = inRange(items, week.from, week.to);
  const monthSel = view === "mes" ? (dia && dia >= grid.from && dia < grid.to ? dia : sameDay(monthStart(fecha), monthStart(today)) ? today : monthStart(fecha)) : null;
  const nextQ = useNextEventAfter(clubId, week.to, view === "semana" && !rangeQ.isLoading && weekItems.length === 0);
  const nextItem = React.useMemo(() => filterAgenda(nextQ.data ?? [], myTeamIds, category, kinds)[0] ?? null, [nextQ.data, myTeamIds, category, kinds]);
  const shiftWeek = (n: number) => setSearch({ fecha: agendaDayKey(addDays(week.from, 7 * n)), dia: undefined });
  const shiftMonth = (n: number) => setSearch({ fecha: agendaDayKey(addMonthsTo(fecha, n)), dia: undefined });

  const matchIds = React.useMemo(() => (isPlayerOnly ? [...matchByEvent.values()].map((m) => m.id) : []), [isPlayerOnly, matchByEvent]);
  const callupsQ = useMatchCallups(matchIds);
  const callupFor = (m: OurMatch | null) => {
    if (!m || !isPlayerOnly || !callupsQ.data) return null;
    const rows = callupsQ.data.filter((c) => c.match_id === m.id);
    return rows.length === 0 ? "Convocatoria pendiente" : rows.some((c) => c.user_id === user.id) ? "Convocado" : "No convocado";
  };

  const [detailLeg, setDetailLeg] = React.useState<"ida" | "regreso" | undefined>(undefined);
  const open = (e: CalendarEventRow, leg?: "ida" | "regreso") => { setDetailLeg(leg); setDetailEvent(e); };

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

  const renderItem = (it: Item) => {
                    const e = it.event;
                    if (it.moment) {
                      const trip = tripById.get(it.trip_id!)!;
                      const hasPass = !!it.moment.flight && !!flightsQ.data?.passFlights.has(it.moment.flight.id);
                      return <TripCard key={it.id} trip={trip} moment={it.moment} hasPass={hasPass} onOpen={() => open(e, it.moment!.leg)}
                        onPass={() => { const f = it.moment!.flight!; setPassTarget({ flightId: f.id, title: `${it.moment!.leg === "regreso" ? "Regreso" : "Ida"} · ${f.origin} → ${f.destination}`, date: f.departs_at }); }}
                        onTrip={() => navigate({ to: "/agenda-viajes", search: { open: trip.id } as any })} />;
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
  };

  const DayBlock = ({ date, list, title }: { date: Date; list: Item[]; title?: string }) => (
    <section id={`dia-${agendaDayKey(date)}`} className="space-y-2">
      <h2 className="px-1 text-xs font-semibold text-muted-foreground">{title ?? longDay(date)}{sameDay(date, today) ? " · Hoy" : sameDay(date, addDays(today, 1)) ? " · Mañana" : ""}</h2>
      {list.map(renderItem)}
    </section>
  );
  const byDay = (list: Item[]) => groupByMonthDay(list).flatMap((m) => m.days);
  const empty = (t: string) => <p className="py-8 text-center text-sm text-muted-foreground">{t}</p>;
  const fwdPages = fwdQ.data?.pages.length ?? 0;

  return (
    <div className="space-y-4">
      <AgendaHeader tab="proximo" category={category} onCategory={setCategory} kinds={kinds} onKinds={setKinds} defaultDate={dia ?? undefined} />
      <ViewSwitch value={view} onChange={(v) => setSearch({ vista: v, fecha: undefined, dia: undefined })} />

      {view === "semana" ? (
        <>
          <WeekStrip start={week.from} items={weekItems} selected={weekAll ? null : dia}
            onSelect={(d) => setSearch({ dia: !weekAll && dia && sameDay(d, dia) ? undefined : agendaDayKey(d) })}
            onShift={shiftWeek} onToday={() => setSearch({ fecha: undefined, dia: undefined })} />
          {isLoading && !events ? <AgendaSkeleton count={3} /> : weekAll ? (
            weekItems.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm font-semibold">Semana libre</p>
                {nextItem ? (
                  <button type="button" className="mt-1 text-sm font-semibold text-primary" onClick={() => setSearch({ fecha: agendaDayKey(new Date(nextItem.starts_at)), dia: undefined })}>
                    Próximo: {shortDay(new Date(nextItem.starts_at))} ›
                  </button>
                ) : null}
              </div>
            ) : byDay(weekItems).map((g) => <DayBlock key={g.date.toISOString()} date={g.date} list={g.events} />)
          ) : (
            <>
              <button type="button" onClick={() => setSearch({ dia: undefined })} className="text-xs font-semibold text-primary">‹ Toda la semana</button>
              {(() => {
                const list = inRange(items, dia!, addDays(dia!, 1));
                return list.length ? <DayBlock date={dia!} list={list} /> : <><h2 className="px-1 text-xs font-semibold text-muted-foreground">{longDay(dia!)}</h2>{empty("Sin eventos este día")}</>;
              })()}
            </>
          )}
        </>
      ) : view === "mes" ? (
        <>
          <MonthGrid month={monthStart(fecha)} days={grid.days} items={inRange(items, grid.from, grid.to)} selected={monthSel!}
            onSelect={(d) => setSearch({ dia: agendaDayKey(d), ...(d.getMonth() !== fecha.getMonth() ? { fecha: agendaDayKey(monthStart(d)) } : {}) })}
            onShift={shiftMonth} onToday={() => setSearch({ fecha: undefined, dia: undefined })} />
          {isLoading && !events ? <AgendaSkeleton count={2} /> : (() => {
            const list = inRange(items, monthSel!, addDays(monthSel!, 1));
            return list.length ? <DayBlock date={monthSel!} list={list} /> : <><h2 className="px-1 text-xs font-semibold text-muted-foreground">{longDay(monthSel!)}</h2>{empty("Sin eventos este día")}</>;
          })()}
        </>
      ) : (
        <>
          <PastToggle on={!!search.pasados} onChange={(v) => setSearch({ pasados: v || undefined })} />
          {isLoading && !events ? <AgendaSkeleton count={4} /> : (
            <>
              {search.pasados ? (
                <div className="space-y-4 border-b border-border/60 pb-4">
                  <h2 className="px-1 text-base font-bold">Anteriores</h2>
                  {groupByMonthDay(items.filter((i) => new Date(i.starts_at) < today), true).map((m) => (
                    <div key={m.month.toISOString()} className="space-y-4">
                      <h3 className="px-1 text-sm font-bold text-muted-foreground">{monthTitle(m.month)}</h3>
                      {m.days.map((g) => <DayBlock key={g.date.toISOString()} date={g.date} list={g.events} title={dayTitle(g.date)} />)}
                    </div>
                  ))}
                  {backQ.isFetching && !backQ.data ? <AgendaSkeleton count={1} /> : backQ.hasNextPage ? <button type="button" disabled={backQ.isFetchingNextPage} onClick={() => backQ.fetchNextPage()} className="w-full py-2 text-sm font-semibold text-primary">{backQ.isFetchingNextPage ? "Cargando…" : "Cargar mes anterior"}</button> : null}
                </div>
              ) : null}
              {(() => {
                const future = items.filter((i) => new Date(i.starts_at) >= today);
                const months = groupByMonthDay(future);
                return months.length === 0 && !fwdQ.hasNextPage ? empty("Sin eventos próximos") : months.map((m) => (
                  <div key={m.month.toISOString()} className="space-y-4">
                    <h2 className="px-1 pt-2 text-base font-bold">{monthTitle(m.month)}</h2>
                    {m.days.map((g) => <DayBlock key={g.date.toISOString()} date={g.date} list={g.events} title={dayTitle(g.date)} />)}
                  </div>
                ));
              })()}
              {fwdQ.hasNextPage ? <LoadMore key={`f${fwdPages}`} active={!fwdQ.isFetchingNextPage} onHit={() => fwdQ.fetchNextPage()} /> : null}
              {fwdQ.isFetchingNextPage ? <AgendaSkeleton count={1} /> : null}
            </>
          )}
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
        tripLeg={detailLeg}
      />
      {passTarget ? <FlightPassViewer target={passTarget} userId={user.id} onClose={() => setPassTarget(null)} /> : null}
    </div>
  );
}
