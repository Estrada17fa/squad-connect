import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Plane, Ticket } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FlightPassViewer, type PassTarget } from "@/components/viajes/mine/PassViewer";
import { AgendaHeader } from "@/components/agenda/AgendaHeader";
import { EmptyState } from "@/components/squad/EmptyState";
import { CardGridSkeleton } from "@/components/squad/LoadingState";
import { useApp } from "@/components/squad/AppLayout";
import { useTrips, type TripRow } from "@/hooks/useTrips";
import { useOurMatches, type OurMatch } from "@/hooks/useMatchOps";
import { isPlayerVisible, splitPlayerTrips } from "@/lib/viajes";
import { tripDayLabel } from "@/lib/misViajes";
import { TripMatchup, tripDates } from "@/components/coord/viajes/parts";
import { MyTripPage } from "@/components/viajes/mine/MyTripPage";

export const Route = createFileRoute("/_authenticated/agenda-viajes")({
  validateSearch: (s: Record<string, unknown>): { open?: string } => (typeof s.open === "string" ? { open: s.open } : {}),
  head: () => ({
    meta: [
      { title: "Squad — Mis viajes" },
      { name: "description", content: "Tus viajes con el club: tu pase de abordar, tu itinerario y tu cuarto." },
      { property: "og:title", content: "Squad — Mis viajes" },
      { property: "og:description", content: "Tu pase, tu itinerario y tu cuarto en cada viaje del club." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AgendaViajesPage,
});

type PassFlight = { id: string; trip_id: string; leg: string | null; origin: string | null; destination: string | null; departs_at: string; arrives_at: string | null };
const pill = "coord-press inline-flex items-center gap-1.5 rounded-full bg-primary/15 px-3.5 py-2 text-xs font-semibold text-primary";

function TripCard({ trip, match, pass, onOpen, onPass }: { trip: TripRow; match: OurMatch | null; pass: PassFlight | null; onOpen: () => void; onPass: () => void }) {
  return (
    <article className="w-full space-y-3 rounded-3xl bg-card p-4 text-center">
      <button type="button" onClick={onOpen} className="coord-press block w-full space-y-3">
        <TripMatchup trip={trip} match={match} />
        <div className="space-y-1">
          <div className="text-base font-bold">{trip.title}</div>
          <div className="text-xs text-muted-foreground">{tripDates(trip)}</div>
        </div>
        <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-semibold text-foreground">{tripDayLabel(trip)}</span>
      </button>
      <div className="flex justify-center gap-2">
        {pass ? <button type="button" onClick={onPass} className={pill}><Ticket className="h-3.5 w-3.5" /> Mi pase</button> : null}
        <button type="button" onClick={onOpen} className={pill}>Ver viaje <ChevronRight className="h-3.5 w-3.5" /></button>
      </div>
    </article>
  );
}

/** Agenda › Mis viajes: solo viajes visibles (Publicados, En curso, Finalizados) donde la persona viaja. */
function AgendaViajesPage() {
  const { user, profile, isSuperAdmin, canViewModule } = useApp();
  const clubId = profile?.club_id ?? null;
  const canAccess = isSuperAdmin || canViewModule("viajes");
  const navigate = useNavigate();
  const { open } = Route.useSearch();

  const tripsQ = useTrips(canAccess ? clubId : null, null);
  const matches = useOurMatches(canAccess ? clubId : null).data ?? [];
  const matchFor = (t: TripRow) => (t.match_event_id ? matches.find((m) => m.calendar_event_id === t.match_event_id) ?? null : null);
  const mine = (tripsQ.data ?? []).filter((t) => isPlayerVisible(t) && t.travelers.some((x) => x.user_id === user.id));
  const { upcoming, past } = splitPlayerTrips(mine);
  const [showPast, setShowPast] = React.useState(false);
  const [passTarget, setPassTarget] = React.useState<PassTarget | null>(null);
  const upIds = upcoming.map((t) => t.id);
  const passQ = useQuery({
    queryKey: ["mis-viajes-passes", upIds.join(","), user.id],
    enabled: upIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from("trip_flights").select("id, trip_id, leg, origin, destination, departs_at, arrives_at").in("trip_id", upIds).order("departs_at");
      if (error) throw error;
      const ids = (data ?? []).map((f) => f.id);
      const { data: passes } = ids.length ? await supabase.from("trip_boarding_passes").select("flight_id").in("flight_id", ids).eq("user_id", user.id) : { data: [] as { flight_id: string }[] };
      const has = new Set((passes ?? []).map((p) => p.flight_id));
      return (data ?? []).filter((f) => has.has(f.id)) as PassFlight[];
    },
  });
  /** Próximo vuelo con pase (o el último si ya salieron todos). */
  const passFor = (tripId: string): PassFlight | null => {
    const fs = (passQ.data ?? []).filter((f) => f.trip_id === tripId);
    const now = Date.now();
    return fs.find((f) => new Date(f.arrives_at ?? f.departs_at).getTime() >= now) ?? fs[fs.length - 1] ?? null;
  };
  const openPass = (f: PassFlight) => setPassTarget({ flightId: f.id, title: `${f.leg === "regreso" ? "Regreso" : "Ida"} · ${f.origin ?? ""} → ${f.destination ?? ""}`, date: f.departs_at });
  const detail = open ? mine.find((t) => t.id === open) ?? null : null;
  const go = (id?: string) => navigate({ to: "/agenda-viajes", search: id ? { open: id } : {} });

  React.useEffect(() => { if (detail) window.scrollTo({ top: 0 }); }, [detail?.id]);

  if (!canAccess) {
    return (
      <div className="space-y-6">
        <AgendaHeader tab="viajes" category={null} onCategory={() => {}} showFilter={false} />
        <EmptyState icon={Plane} title="Sin acceso" message="Tu rol actual no tiene permisos para ver viajes." />
      </div>
    );
  }

  if (detail) return <MyTripPage trip={detail} match={matchFor(detail)} userId={user.id} onBack={() => go()} />;

  return (
    <div className="space-y-6">
      <AgendaHeader tab="viajes" category={null} onCategory={() => {}} showFilter={false} />
      {tripsQ.isLoading ? (
        <CardGridSkeleton />
      ) : upcoming.length === 0 ? (
        <EmptyState icon={Plane} title="No tienes viajes próximos" message="Cuando te convoquen a un viaje aparecerá aquí." />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {upcoming.map((t) => <TripCard key={t.id} trip={t} match={matchFor(t)} pass={passFor(t.id)} onOpen={() => go(t.id)} onPass={() => { const f = passFor(t.id); if (f) openPass(f); }} />)}
        </div>
      )}
      {past.length ? (
        <section className="space-y-2">
          <button type="button" onClick={() => setShowPast((v) => !v)} aria-expanded={showPast} className="flex w-full items-center justify-between rounded-xl px-1 py-2 text-sm font-semibold text-muted-foreground">
            <span>Viajes anteriores · {past.length}</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showPast ? "rotate-180" : ""}`} />
          </button>
          {showPast ? (
            <ul className="divide-y divide-border/50 rounded-2xl bg-card">
              {past.map((t) => (
                <li key={t.id}>
                  <button onClick={() => go(t.id)} className="coord-press flex min-h-14 w-full items-center gap-3 px-4 text-left">
                    <Plane className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{t.title}</span><span className="block text-xs text-muted-foreground">{tripDates(t)}</span></span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
      {passTarget ? <FlightPassViewer target={passTarget} userId={user.id} onClose={() => setPassTarget(null)} /> : null}
    </div>
  );
}
