/** Reglas puras de "Mis viajes" (vista del viajero) y de la asignación de pases con tarjetas. */
import { nameScore, type MatchConfidence } from "./boardingPassMatch";

export type Leg = "ida" | "regreso";

/** Tramo inicial: Regreso si ya despegó el último vuelo de ida; si no, Ida. */
export function defaultLeg(flights: { leg: string; departs_at: string; arrives_at?: string | null }[], now = new Date()): Leg {
  const ida = flights.filter((f) => f.leg === "ida");
  const regreso = flights.filter((f) => f.leg === "regreso");
  if (!regreso.length) return "ida";
  if (!ida.length) return "regreso";
  const lastIda = ida.map((f) => f.arrives_at || f.departs_at).sort().at(-1)!;
  return new Date(lastIda) <= now ? "regreso" : "ida";
}

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Etiqueta corta de tiempo para la tarjeta de un viaje. */
export function tripTimeLabel(
  trip: { status: string; departure_at: string; return_at: string | null; meeting_at?: string | null },
  now = new Date(),
  time: (iso: string) => string = (iso) => new Date(iso).toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit" }),
): string {
  if (trip.status === "completado") return "Finalizado";
  const dep = new Date(trip.meeting_at || trip.departure_at);
  const ret = trip.return_at ? new Date(trip.return_at) : null;
  if (dep > now) {
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
    if (sameDay(dep, now)) return `Sale hoy ${time(dep.toISOString())}`;
    if (sameDay(dep, tomorrow)) return `Sale mañana ${time(dep.toISOString())}`;
    const days = Math.ceil((dep.getTime() - now.getTime()) / 86_400_000);
    return `Sale en ${days} días`;
  }
  if (ret && sameDay(ret, now)) return "Regresa hoy";
  return "En curso";
}

export type MyItemKind = "cita" | "vuelo" | "transporte" | "hotel" | "comida" | "partido";
export interface MyItem { id: string; at: string; kind: MyItemKind; title: string; detail: string | null; place: string | null; transportType?: string }

/** Itinerario de UNA persona: solo lo que le toca, en orden de hora. */
export function myItinerary(input: {
  userId: string;
  trip: { meeting_at: string | null; meeting_point: string | null; match_event: { title: string; starts_at: string; location: string | null } | null };
  flights: { id: string; flight_code: string; airline: string | null; origin: string; destination: string; departs_at: string; passengers: { user_id: string }[] }[];
  transports: { id: string; label: string | null; transport_type: string; pickup_location: string; destination: string; departs_at: string; passengers: { user_id: string }[] }[];
  hotels: { id: string; name: string; address: string | null; check_in_at: string; check_out_at: string | null; rooms: { occupants: { user_id: string }[] }[] }[];
  meals: { id: string; meal_type: string; scheduled_at: string; location: string | null }[];
  mealLabel?: (t: string) => string;
}): MyItem[] {
  const { userId, trip } = input;
  const out: MyItem[] = [];
  if (trip.meeting_at) out.push({ id: "cita", at: trip.meeting_at, kind: "cita", title: "Reunión del viaje", detail: trip.meeting_point, place: trip.meeting_point });
  for (const f of input.flights) {
    if (!f.passengers.some((p) => p.user_id === userId)) continue;
    out.push({ id: `f-${f.id}`, at: f.departs_at, kind: "vuelo", title: `Vuelo ${f.flight_code}${f.airline ? ` · ${f.airline}` : ""}`, detail: `${f.origin} → ${f.destination}`, place: null });
  }
  for (const t of input.transports) {
    if (!t.passengers.some((p) => p.user_id === userId)) continue;
    out.push({ id: `t-${t.id}`, at: t.departs_at, kind: "transporte", title: t.label || "Transporte", detail: `${t.pickup_location} → ${t.destination}`, place: t.pickup_location, transportType: t.transport_type });
  }
  for (const h of input.hotels) {
    if (!h.rooms.some((r) => r.occupants.some((o) => o.user_id === userId))) continue;
    const place = h.address || h.name;
    out.push({ id: `hi-${h.id}`, at: h.check_in_at, kind: "hotel", title: `Check-in · ${h.name}`, detail: h.address, place });
    if (h.check_out_at) out.push({ id: `ho-${h.id}`, at: h.check_out_at, kind: "hotel", title: `Check-out · ${h.name}`, detail: h.address, place });
  }
  for (const m of input.meals) out.push({ id: `m-${m.id}`, at: m.scheduled_at, kind: "comida", title: input.mealLabel?.(m.meal_type) ?? m.meal_type, detail: m.location, place: m.location });
  if (trip.match_event) out.push({ id: "partido", at: trip.match_event.starts_at, kind: "partido", title: trip.match_event.title, detail: trip.match_event.location, place: trip.match_event.location });
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

/** Id del siguiente elemento por suceder (null si ya pasaron todos). */
export function nextItemId(items: { id: string; at: string }[], now = new Date()) {
  return items.find((i) => new Date(i.at) > now)?.id ?? null;
}

/* ---------- Tarjetas de pases ---------- */

const RANK: Record<MatchConfidence, number> = { alta: 0, media: 1, ninguna: 2 };

/** Orden: seguras, luego "revisar", al final sin coincidencia (estable dentro de cada grupo). */
export function orderPassCards<T extends { confidence: MatchConfidence; suggestedUserId: string | null }>(cards: T[]): T[] {
  const rank = (c: T) => (c.suggestedUserId ? RANK[c.confidence] : 2);
  return cards.map((c, i) => ({ c, i })).sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i).map((x) => x.c);
}

/** Las N personas más parecidas al nombre leído, sin quienes ya tienen pase. */
export function similarPeople<P extends { user_id: string; label: string }>(nameGuess: string | null, people: P[], exclude: Set<string>, n = 4): P[] {
  return people
    .filter((p) => !exclude.has(p.user_id))
    .map((p, i) => ({ p, i, s: nameGuess ? nameScore(nameGuess, p.label) : 0 }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .slice(0, n)
    .map((x) => x.p);
}

/** Personas a avisar al salir: quienes recibieron al menos un pase nuevo (y no deshecho) en la sesión. */
export function sessionNoticeTargets(history: { userId: string; undone?: boolean }[]) {
  return [...new Set(history.filter((h) => !h.undone).map((h) => h.userId))];
}
