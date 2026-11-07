import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
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
import { AgendaHero, AgendaRow, shortDay } from "@/components/agenda/AgendaParts";
import { agendaKind, filterAgenda, groupByDay, hasMoreAfter, pickHero, type AgendaKind } from "@/lib/agenda";
import { buildEventContext } from "@/lib/eventContext";
import { formatRelativeDayLabel } from "@/lib/calendar-utils";
import { isPlayerVisible } from "@/lib/viajes";
import { cn } from "@/lib/utils";

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

  const hero = React.useMemo(() => pickHero(visible, (e) => isMyTrip(e.trip_id)), [visible, isMyTrip]);
  const groups = React.useMemo(() => groupByDay(visible, days), [visible, days]);
  const more = hasMoreAfter(visible, days);

  const heroMatch = hero && agendaKind(hero) === "partido" ? matchByEvent.get(hero.id) ?? null : null;
  const callupsQ = useMatchCallups(heroMatch && isPlayerOnly ? [heroMatch.id] : []);
  const callup = !heroMatch || !isPlayerOnly || !callupsQ.data
    ? null
    : callupsQ.data.length === 0
      ? ("Convocatoria pendiente" as const)
      : callupsQ.data.some((c) => c.user_id === user.id)
        ? ("Convocado" as const)
        : ("No convocado" as const);
  const heroMyTrip = heroMatch
    ? (tripsQ.data ?? []).find((t) => t.match_event_id === hero!.id && isMyTrip(t.id)) ?? null
    : null;
  const heroTrip = hero?.trip_id ? tripById.get(hero.trip_id) ?? null : null;

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
          {hero ? (
            <AgendaHero
              event={hero}
              match={heroMatch}
              callup={callup}
              myTrip={heroMyTrip}
              trip={heroTrip && isMyTrip(heroTrip.id) ? heroTrip : null}
              onOpen={() => open(hero)}
              onOpenTrip={openTrip}
            />
          ) : null}

          {groups.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nada en tu agenda esta semana</p>
          ) : (
            groups.map((g) => {
              const rel = formatRelativeDayLabel(g.date);
              const near = rel === "HOY" || rel === "MAÑANA";
              return (
                <section key={g.date.toISOString()} className="space-y-1.5">
                  <h2 className="flex items-baseline gap-2 px-1 text-xs">
                    <span className={cn("font-bold", near ? "text-primary" : "text-foreground")}>
                      {rel === "HOY" ? "Hoy" : rel === "MAÑANA" ? "Mañana" : shortDay(g.date)}
                    </span>
                    {near ? <span className="text-muted-foreground">{shortDay(g.date)}</span> : null}
                  </h2>
                  <div className="overflow-hidden rounded-2xl bg-card">
                    {g.events.map((e) => {
                      const meeting = e.meeting_id ? meetingById.get(e.meeting_id) : null;
                      const mine = meeting?.attendees.find((a) => a.user_id === user.id);
                      return (
                        <AgendaRow
                          key={e.id}
                          event={e}
                          context={contextFor(e)}
                          match={matchByEvent.get(e.id) ?? null}
                          rsvp={meeting && mine && new Date(e.starts_at) > new Date() ? { status: mine.attendance_status, onRespond: (s) => respond(meeting.id, s) } : null}
                          onClick={() => open(e)}
                        />
                      );
                    })}
                  </div>
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
