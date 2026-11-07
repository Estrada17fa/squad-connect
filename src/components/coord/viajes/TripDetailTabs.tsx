import * as React from "react";
import { Link } from "@tanstack/react-router";
import { Bus, CalendarClock, Check, Hotel, MapPin, Plane, Ticket, Trophy, UserPlus, Utensils, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import type { TripRow } from "@/hooks/useTrips";
import { addTraveler, removeTraveler } from "@/hooks/useTrips";
import type { OurMatch } from "@/hooks/useMatchOps";
import { useTripMaterial } from "@/hooks/useTripMaterial";
import { LocationDisplay } from "@/components/calendar/LocationDisplay";
import { TravelerPicker, type TeamMemberOption } from "@/components/viajes/TravelerPicker";
import { FlightsSection } from "@/components/viajes/logistica/FlightsSection";
import { TransportsSection } from "@/components/viajes/logistica/TransportsSection";
import { HotelsSection } from "@/components/viajes/logistica/HotelsSection";
import { MealsSection } from "@/components/viajes/logistica/MealsSection";
import { LuggageSection } from "@/components/viajes/logistica/LuggageSection";
import { TripDocumentsSection } from "@/components/viajes/logistica/TripDocumentsSection";
import { ConfirmDialog } from "@/components/squad/ConfirmDialog";
import { MEAL_TYPE_LABEL } from "@/lib/tripLogistics";
import { buildItinerary, type ItineraryItem, type TripSection } from "@/lib/viajes";
import { cn } from "@/lib/utils";
import { PersonAvatar, ReadinessRing, SectionHead, shortDate, timeLabel } from "./parts";
import { PassAssignFlow } from "./passes/PassAssignFlow";
import type { useTripLogistics } from "./useTripsModule";

type Logistics = ReturnType<typeof useTripLogistics>;
interface TabProps { trip: TripRow; match: OurMatch | null; lg: Logistics; editable: boolean; userId: string; go: (s: TripSection) => void }

const KIND_ICON: Record<ItineraryItem["kind"], React.ComponentType<{ className?: string }>> = {
  cita: MapPin, salida: Plane, vuelo: Plane, transporte: Bus, hotel: Hotel, comida: Utensils, partido: Trophy, regreso: Plane,
};

export function ResumenTab({ trip, lg, go }: TabProps) {
  const { readiness } = lg;
  if (lg.loading) return <div className="space-y-3"><div className="h-24 animate-pulse rounded-2xl bg-card" /><div className="h-48 animate-pulse rounded-2xl bg-card" /></div>;
  const items = buildItinerary({ trip, flights: lg.flights, transports: lg.transports, hotels: lg.hotels, meals: lg.meals, mealLabel: (t) => MEAL_TYPE_LABEL[t as keyof typeof MEAL_TYPE_LABEL] ?? t });
  const byDay = new Map<string, ItineraryItem[]>();
  for (const it of items) {
    const k = format(new Date(it.at), "yyyy-MM-dd");
    byDay.set(k, [...(byDay.get(k) ?? []), it]);
  }
  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-card p-4">
        <div className="flex items-center gap-3">
          <ReadinessRing percent={readiness.percent} size={52} />
          <div className="min-w-0">
            <div className="font-semibold">{readiness.ready ? "Todo listo para viajar" : readiness.total ? "Preparación del viaje" : "Aún sin logística"}</div>
            <div className="text-xs text-muted-foreground">{readiness.total ? `${readiness.done} de ${readiness.total} puntos listos` : "Agrega vuelos, hotel o transporte."}</div>
          </div>
        </div>
        {readiness.gaps.length ? (
          <ul className="mt-3 divide-y divide-border/50">
            {readiness.gaps.map((g) => (
              <li key={g.key}>
                <button onClick={() => go(g.section)} className="coord-press flex min-h-11 w-full items-center justify-between gap-2 text-left text-sm">
                  <span className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-area-general" />{g.label}</span>
                  <span className="text-muted-foreground">›</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {trip.meeting_point || trip.meeting_location_id ? (
        <section className="space-y-2">
          <SectionHead title={`Punto de reunión${trip.meeting_at ? ` · ${timeLabel(trip.meeting_at)}` : ""}`} />
          <LocationDisplay clubId={trip.club_id} locationId={trip.meeting_location_id ?? null} text={trip.meeting_point} />
        </section>
      ) : null}

      <section className="space-y-2">
        <SectionHead title="Itinerario" />
        {items.length === 0 ? (
          <p className="rounded-2xl bg-card p-4 text-sm text-muted-foreground">El itinerario se arma solo con la cita, vuelos, transportes, hotel y comidas.</p>
        ) : (
          [...byDay.entries()].map(([day, list]) => (
            <div key={day} className="space-y-1">
              <div className="px-1 text-xs font-semibold text-muted-foreground">{shortDate(list[0]!.at)}</div>
              <ol className="divide-y divide-border/50 overflow-hidden rounded-2xl bg-card">
                {list.map((it) => {
                  const Icon = KIND_ICON[it.kind];
                  return (
                    <li key={it.id} className="flex items-start gap-3 px-3 py-2.5">
                      <span className="w-16 shrink-0 pt-0.5 text-xs font-semibold tabular-nums text-muted-foreground">{timeLabel(it.at)}</span>
                      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", it.kind === "partido" ? "text-primary" : "text-area-general")} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{it.title}</span>
                        {it.detail ? <span className="block truncate text-xs text-muted-foreground">{it.detail}</span> : null}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))
        )}
      </section>

      {trip.notes ? (
        <section className="space-y-2">
          <SectionHead title="Notas" />
          <p className="whitespace-pre-wrap rounded-2xl bg-card p-4 text-sm text-muted-foreground">{trip.notes}</p>
        </section>
      ) : null}
    </div>
  );
}

function StatusDot({ ok, label }: { ok: boolean | null; label: string }) {
  if (ok === null) return null;
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", ok ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
      {ok ? <Check className="h-2.5 w-2.5" /> : <X className="h-2.5 w-2.5" />}{label}
    </span>
  );
}

export function ViajerosTab({ trip, match, lg, editable }: TabProps) {
  const [picker, setPicker] = React.useState(false);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState<{ id: string; userId: string; name: string } | null>(null);
  const selected = React.useMemo(() => new Set(trip.travelers.map((t) => t.user_id)), [trip.travelers]);
  const toggle = async (m: TeamMemberOption) => {
    setBusyId(m.id);
    try {
      const ex = trip.travelers.find((t) => t.user_id === m.id);
      if (ex) await removeTraveler(ex.id, trip.id, m.id);
      else await addTraveler(trip.id, m.id, m.job_title ?? m.role_name ?? null);
    } catch (e) {
      toast.error((e as Error).message || "No se pudo actualizar");
    } finally {
      setBusyId(null);
    }
  };
  const list = [...trip.travelers].sort((a, b) => (a.profile?.full_name ?? "").localeCompare(b.profile?.full_name ?? "", "es"));
  return (
    <div className="space-y-3">
      <SectionHead title={`Viajeros · ${trip.travelers.length}`} onAdd={editable ? () => setPicker((v) => !v) : undefined} addLabel="Agregar viajeros" />
      {match ? <p className="text-xs text-muted-foreground">Desde la convocatoria del partido. Puedes agregar staff o quitar a alguien.</p> : null}
      {picker && editable ? <TravelerPicker clubId={trip.club_id} teamId={trip.team_id} selectedIds={selected} busyId={busyId} onToggle={toggle} /> : null}
      {list.length === 0 ? (
        <button disabled={!editable} onClick={() => setPicker(true)} className="flex w-full flex-col items-center gap-2 rounded-2xl bg-card p-6 text-sm text-muted-foreground">
          <UserPlus className="h-6 w-6" />Aún no hay viajeros.
        </button>
      ) : (
        <ul className="divide-y divide-border/50 overflow-hidden rounded-2xl bg-card">
          {list.map((t) => {
            const st = lg.readiness.byTraveler[t.user_id];
            return (
              <li key={t.id} className="flex items-center gap-3 px-3 py-2.5">
                <PersonAvatar p={t.profile} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{t.profile?.full_name ?? t.profile?.email}</span>
                  <span className="mt-0.5 flex flex-wrap gap-1">
                    {t.role_note ? <span className="text-[11px] text-muted-foreground">{t.role_note}</span> : null}
                    {st ? (<><StatusDot ok={st.flight} label="Vuelo" /><StatusDot ok={st.pass} label="Pase" /><StatusDot ok={st.room} label="Cuarto" /><StatusDot ok={st.transport} label="Transp." /></>) : null}
                  </span>
                </span>
                {editable ? (
                  <button aria-label="Quitar del viaje" onClick={() => setConfirm({ id: t.id, userId: t.user_id, name: t.profile?.full_name ?? "esta persona" })} className="coord-press flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground"><X className="h-4 w-4" /></button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      <ConfirmDialog
        open={!!confirm}
        onOpenChange={(v) => !v && setConfirm(null)}
        title="Quitar del viaje"
        description={`¿Quitar a ${confirm?.name} del viaje? También sale de vuelos, transportes y cuartos.`}
        confirmLabel="Quitar"
        onConfirm={async () => {
          if (!confirm) return;
          try { await removeTraveler(confirm.id, trip.id, confirm.userId); } catch (e) { toast.error((e as Error).message); }
          setConfirm(null);
        }}
      />
    </div>
  );
}

export function VuelosTab({ trip, lg, editable, userId }: TabProps) {
  const [bulk, setBulk] = React.useState<{ flightId: string | null } | null>(null);
  const passes = lg.flights.reduce((n, f) => n + f.boarding_passes.length, 0);
  const expected = lg.flights.reduce((n, f) => n + f.passengers.length, 0);
  return (
    <div className="space-y-5">
      {lg.flights.length ? (
        <button onClick={() => setBulk({ flightId: null })} disabled={!editable} className="coord-press flex w-full items-center gap-3 rounded-2xl bg-area-general-soft p-3 text-left disabled:opacity-60">
          <Ticket className="h-5 w-5 text-area-general" />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">Subir pases</span>
            <span className="block text-xs text-muted-foreground">{passes} de {expected} pases cargados · PDF o fotos, varios a la vez</span>
          </span>
          <span className="text-muted-foreground">›</span>
        </button>
      ) : null}
      {(["ida", "regreso"] as const).map((leg) => (
        <FlightsSection key={leg} tripId={trip.id} userId={userId} leg={leg} flights={lg.flights.filter((f) => f.leg === leg)} allFlights={lg.flights} travelers={lg.travelers} canEdit={editable} onUploadPasses={(flightId) => setBulk({ flightId })} />
      ))}
      {bulk ? <PassAssignFlow tripId={trip.id} flights={lg.flights} travelers={lg.travelers} initialFlightId={bulk.flightId} onClose={() => setBulk(null)} /> : null}
    </div>
  );
}

export function HotelTab({ trip, lg, editable, userId }: TabProps) {
  return <HotelsSection tripId={trip.id} clubId={trip.club_id} userId={userId} hotels={lg.hotels} travelers={lg.travelers} canEdit={editable} />;
}

export function TransporteTab({ trip, lg, editable, userId }: TabProps) {
  return (
    <div className="space-y-5">
      {(["ida", "regreso"] as const).map((leg) => (
        <TransportsSection key={leg} tripId={trip.id} clubId={trip.club_id} userId={userId} leg={leg} transports={lg.transports.filter((t) => t.leg === leg)} allTransports={lg.transports} travelers={lg.travelers} canEdit={editable} />
      ))}
    </div>
  );
}

export function ComidasTab({ trip, lg, editable, userId }: TabProps) {
  return <MealsSection tripId={trip.id} userId={userId} meals={lg.meals} canEdit={editable} />;
}

export function EquipajeTab({ trip, lg, editable, userId }: TabProps) {
  const material = useTripMaterial(trip.id).data ?? [];
  return <LuggageSection tripId={trip.id} clubId={trip.club_id} teamId={trip.team_id} userId={userId} defaultReturnAt={trip.return_at} loans={material} travelers={lg.travelers.map((t) => ({ user_id: t.user_id, profile: t.profile }))} canEdit={editable} />;
}

export function DocumentosTab({ trip, editable, userId }: TabProps) {
  return <TripDocumentsSection tripId={trip.id} clubId={trip.club_id} teamId={trip.team_id} userId={userId} canEdit={editable} />;
}

export function MatchLink({ match, trip }: { match: OurMatch | null; trip: TripRow }) {
  if (!trip.match_event) return null;
  return (
    <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
      <CalendarClock className="h-3.5 w-3.5" />
      Partido {shortDate(trip.match_event.starts_at)} · {timeLabel(trip.match_event.starts_at)}
      {match?.id ? (
        <Link to="/m/partidos" search={{ open: match.id }} className="font-semibold text-primary">Ver ›</Link>
      ) : null}
    </div>
  );
}
