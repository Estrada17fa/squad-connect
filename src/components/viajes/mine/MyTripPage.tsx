import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { BedDouble, Bus, Car, ChevronLeft, MapPin, MessageCircle, Phone, Plane, Trophy, Utensils } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TripRow } from "@/hooks/useTrips";
import type { OurMatch } from "@/hooks/useMatchOps";
import { useTripFlights, type TripFlight } from "@/hooks/useTripFlights";
import { useTripTransports } from "@/hooks/useTripTransports";
import { useTripHotels } from "@/hooks/useTripHotels";
import { useTripMeals } from "@/hooks/useTripMeals";
import { MEAL_TYPE_LABEL } from "@/lib/tripLogistics";
import { defaultLeg, myItinerary, nextItemId, tripDayLabel, type Leg, type MyItem } from "@/lib/misViajes";
import { PersonAvatar, TripMatchup, timeLabel, tripDates } from "@/components/coord/viajes/parts";
import { PassViewer } from "./PassViewer";
import { cn } from "@/lib/utils";

const mapsUrl = (q: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
const dayLabel = (iso: string) => { const s = format(new Date(iso), "EEEE d", { locale: es }); return s.charAt(0).toUpperCase() + s.slice(1); };

function itemIcon(it: MyItem) {
  if (it.kind === "cita") return MapPin;
  if (it.kind === "vuelo") return Plane;
  if (it.kind === "transporte") return it.transportType === "bus" ? Bus : Car;
  if (it.kind === "hotel") return BedDouble;
  if (it.kind === "comida") return Utensils;
  return Trophy;
}

/** Boleto "MI PASE" de un vuelo. */
function PassTicket({ flight, userId, onOpen }: { flight: TripFlight; userId: string; onOpen: (paths: string[], flight: TripFlight) => void }) {
  const mine = flight.boarding_passes.filter((p) => p.user_id === userId);
  const p = mine[0];
  const facts = [
    ["Asiento", p?.seat],
    ["Grupo", p?.boarding_group],
    ["Terminal", p?.terminal],
    ["Puerta", flight.gate],
  ].filter((x): x is [string, string] => !!x[1]);
  return (
    <section aria-label="Mi pase" className={cn("overflow-hidden rounded-3xl bg-card", p && "cursor-pointer")} onClick={p ? () => onOpen(mine.map((x) => x.file_path), flight) : undefined}>
      <div className="space-y-4 p-4">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide">
          <span className="text-primary">Mi pase{flight.airline ? ` · ${flight.airline}` : ""}</span>
          <span className="text-muted-foreground">{flight.flight_code}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <div className="text-3xl font-bold tracking-tight">{flight.origin}</div>
            <div className="text-xs text-muted-foreground">{timeLabel(flight.departs_at)}</div>
          </div>
          <div className="relative flex flex-1 items-center">
            <span className="w-full border-t-2 border-dashed border-border" />
            <Plane className="absolute left-1/2 h-4 w-4 -translate-x-1/2 bg-card text-primary" />
          </div>
          <div className="min-w-0 text-right">
            <div className="text-3xl font-bold tracking-tight">{flight.destination}</div>
            <div className="text-xs text-muted-foreground">{flight.arrives_at ? timeLabel(flight.arrives_at) : ""}</div>
          </div>
        </div>
      </div>
      <div className="relative flex items-center">
        <span className="-ml-3 h-6 w-6 rounded-full bg-background" />
        <span className="flex-1 border-t-2 border-dashed border-border" />
        <span className="-mr-3 h-6 w-6 rounded-full bg-background" />
      </div>
      <div className="space-y-3 p-4">
        {facts.length ? (
          <div className="grid grid-cols-4 gap-2">
            {facts.map(([k, v]) => (
              <div key={k}><div className="text-[11px] text-muted-foreground">{k}</div><div className="text-lg font-bold">{v}</div></div>
            ))}
          </div>
        ) : null}
        {p ? (
          <button onClick={(e) => { e.stopPropagation(); onOpen(mine.map((x) => x.file_path), flight); }} className="coord-press h-12 w-full rounded-2xl bg-primary text-sm font-semibold text-primary-foreground">Ver pase completo</button>
        ) : (
          <p className="rounded-2xl bg-muted px-3 py-3 text-center text-sm text-muted-foreground">Tu pase aún no está cargado</p>
        )}
      </div>
    </section>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</h2>;
}

function useContact(trip: TripRow) {
  return useQuery({
    queryKey: ["trip-contact", trip.created_by],
    enabled: !!trip.created_by,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name, email, avatar_url, phone").eq("id", trip.created_by!).maybeSingle();
      return data;
    },
  });
}

/** "Mi viaje" del viajero: solo lo suyo y nada de cajas vacías. */
export function MyTripPage({ trip, match, userId, onBack }: { trip: TripRow; match: OurMatch | null; userId: string; onBack: () => void }) {
  const flightsQ = useTripFlights(trip.id);
  const flights = React.useMemo(() => (flightsQ.data ?? []).filter((f) => f.passengers.some((p) => p.user_id === userId)).sort((a, b) => a.departs_at.localeCompare(b.departs_at)), [flightsQ.data, userId]);
  const transports = useTripTransports(trip.id).data ?? [];
  const hotels = useTripHotels(trip.id).data ?? [];
  const meals = useTripMeals(trip.id).data ?? [];
  const contact = useContact(trip).data;

  const hasBoth = flights.some((f) => f.leg === "ida") && flights.some((f) => f.leg === "regreso");
  const [leg, setLeg] = React.useState<Leg | null>(null);
  const activeLeg: Leg = leg ?? defaultLeg(flights);
  const legFlights = flights.filter((f) => (hasBoth ? f.leg === activeLeg : true));
  const [pass, setPass] = React.useState<{ paths: string[]; title: string; date: string } | null>(null);
  const openPass = (paths: string[], f: TripFlight) => setPass({ paths, title: `${f.leg === "regreso" ? "Regreso" : "Ida"} · ${f.origin} → ${f.destination}`, date: f.departs_at });

  const items = React.useMemo(() => {
    const all = myItinerary({ userId, trip, flights, transports, hotels, meals, mealLabel: (t) => MEAL_TYPE_LABEL[t as keyof typeof MEAL_TYPE_LABEL] ?? t });
    if (!hasBoth) return all;
    // Con Ida · Regreso: el itinerario muestra el tramo elegido (corte en el primer vuelo de regreso).
    const cut = flights.filter((f) => f.leg === "regreso").map((f) => f.departs_at).sort()[0]!;
    const firstReturnItem = all.find((i) => i.kind === "vuelo" && i.at === cut);
    const idx = firstReturnItem ? all.indexOf(firstReturnItem) : all.length;
    const transportLeg = new Map(transports.map((t) => [`t-${t.id}`, t.leg]));
    return all.filter((it, i) => {
      const tl = transportLeg.get(it.id);
      if (tl) return tl === activeLeg;
      return activeLeg === "ida" ? i < idx : i >= idx;
    });
  }, [userId, trip, flights, transports, hotels, meals, hasBoth, activeLeg]);
  const nextId = nextItemId(items);
  const now = new Date();

  const stays = hotels
    .map((h) => ({ h, room: h.rooms.find((r) => r.occupants.some((o) => o.user_id === userId)) }))
    .filter((s) => !!s.room);

  const byDay: [string, MyItem[]][] = [];
  for (const it of items) {
    const k = format(new Date(it.at), "yyyy-MM-dd");
    const last = byDay.at(-1);
    if (last && last[0] === k) last[1].push(it); else byDay.push([k, [it]]);
  }
  const phone = contact?.phone?.replace(/[^\d+]/g, "") ?? "";
  const wa = phone.replace(/\D/g, "");

  return (
    <div className="space-y-6 pb-8">
      <button onClick={onBack} className="coord-press -ml-1 flex min-h-11 items-center gap-1 text-sm font-semibold text-muted-foreground">
        <ChevronLeft className="h-5 w-5" /> Mis viajes
      </button>

      <header className="space-y-2 text-center">
        <TripMatchup trip={trip} match={match} />
        <h1 className="text-xl font-bold">{trip.title}</h1>
        <p className="text-sm text-muted-foreground">{tripDates(trip)}</p>
        <span className="inline-flex rounded-full bg-primary/15 px-3 py-1 text-xs font-semibold text-primary">{tripDayLabel(trip, { userId, flights, transports })}</span>
      </header>

      {hasBoth ? (
        <div role="tablist" aria-label="Tramo" className="grid grid-cols-2 rounded-2xl bg-muted p-1">
          {(["ida", "regreso"] as const).map((l) => (
            <button key={l} role="tab" aria-selected={activeLeg === l} onClick={() => setLeg(l)} className={cn("h-10 rounded-xl text-sm font-semibold", activeLeg === l ? "bg-card text-foreground" : "text-muted-foreground")}>
              {l === "ida" ? "Ida" : "Regreso"}
            </button>
          ))}
        </div>
      ) : null}

      {legFlights.length ? (
        <div className="space-y-3">
          {legFlights.map((f) => <PassTicket key={f.id} flight={f} userId={userId} onOpen={setPassPaths} />)}
        </div>
      ) : null}

      {items.length ? (
        <section className="space-y-3">
          <SectionTitle>Mi itinerario</SectionTitle>
          <div className="space-y-4 rounded-2xl bg-card p-4">
            {byDay.map(([k, list]) => (
              <div key={k} className="space-y-1">
                <div className="text-sm font-semibold">{dayLabel(list[0]!.at)}</div>
                <ol className="relative">
                  {list.map((it, i) => {
                    const Icon = itemIcon(it);
                    const past = new Date(it.at) <= now;
                    const isNext = it.id === nextId;
                    const body = (
                      <div className={cn("flex gap-3 py-2", past && !isNext && "opacity-50")}>
                        <span className="relative flex flex-col items-center">
                          <span className={cn("z-10 flex h-8 w-8 items-center justify-center rounded-full", isNext ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}><Icon className="h-4 w-4" /></span>
                          {i < list.length - 1 ? <span className="absolute top-8 h-[calc(100%+0.5rem)] w-px bg-border" /> : null}
                        </span>
                        <span className="min-w-0 flex-1 pt-0.5 text-left">
                          <span className="block text-sm font-semibold">{timeLabel(it.at)} · {it.title}</span>
                          {it.detail ? <span className="block truncate text-xs text-muted-foreground">{it.detail}</span> : null}
                        </span>
                      </div>
                    );
                    return (
                      <li key={it.id}>
                        {it.place ? <a href={mapsUrl(it.place)} target="_blank" rel="noopener noreferrer" aria-label={`Cómo llegar: ${it.title}`} className="block">{body}</a> : body}
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {stays.length ? (
        <section className="space-y-3">
          <SectionTitle>Mi cuarto</SectionTitle>
          {stays.map(({ h, room }) => {
            const mates = room!.occupants.filter((o) => o.user_id !== userId);
            return (
              <div key={h.id} className="space-y-3 rounded-2xl bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0"><div className="truncate font-semibold">{h.name}</div>{h.address ? <div className="truncate text-xs text-muted-foreground">{h.address}</div> : null}</div>
                  <div className="text-right"><div className="text-[11px] text-muted-foreground">Cuarto</div><div className="text-lg font-bold">{room!.room_label}</div></div>
                </div>
                {mates.length ? (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground">Lo compartes con</div>
                    {mates.map((m) => (
                      <div key={m.id} className="flex items-center gap-2 text-sm"><PersonAvatar p={m.profile} size={8} />{m.profile?.full_name ?? m.profile?.email}</div>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </section>
      ) : null}

      {contact && contact.id !== userId ? (
        <section className="space-y-3">
          <SectionTitle>Contacto</SectionTitle>
          <div className="flex items-center gap-3 rounded-2xl bg-card p-4">
            <PersonAvatar p={contact} size={10} />
            <div className="min-w-0 flex-1"><div className="truncate font-semibold">{contact.full_name ?? contact.email}</div><div className="text-xs text-muted-foreground">Responsable del viaje</div></div>
            {phone ? (
              <>
                <a href={`tel:${phone}`} aria-label="Llamar" className="flex h-11 w-11 items-center justify-center rounded-full bg-muted"><Phone className="h-5 w-5" /></a>
                <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/15 text-primary"><MessageCircle className="h-5 w-5" /></a>
              </>
            ) : null}
          </div>
        </section>
      ) : null}

      {pass ? <PassViewer paths={pass.paths} title={pass.title} date={pass.date} onClose={() => setPass(null)} /> : null}
    </div>
  );
}
