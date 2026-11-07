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

const startDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const dayDiff = (d: Date, now: Date) => Math.round((startDay(d) - startDay(now)) / 86_400_000);
const shortDay = (d: Date) => `${d.toLocaleDateString("es-MX", { weekday: "short" }).replace(".", "")} ${d.getDate()}`;

type PersonLegs = {
  userId?: string | null;
  flights?: { leg: string; departs_at: string; passengers?: { user_id: string }[] }[];
  transports?: { leg?: string | null; departs_at: string; passengers?: { user_id: string }[] }[];
};
const mineOnly = <T extends { passengers?: { user_id: string }[] }>(xs: T[] | undefined, userId?: string | null) =>
  (xs ?? []).filter((x) => !userId || !x.passengers || x.passengers.some((p) => p.user_id === userId));

/** Día de salida de UNA persona: lo más temprano entre la reunión y su primer vuelo/transporte de ida; si no, el día del viaje. Solo la fecha. */
export function personDeparture(trip: { departure_at: string; meeting_at?: string | null }, legs: PersonLegs = {}): Date {
  const c = [trip.meeting_at, ...mineOnly(legs.flights, legs.userId).filter((f) => f.leg === "ida").map((f) => f.departs_at), ...mineOnly(legs.transports, legs.userId).filter((t) => (t.leg ?? "ida") === "ida").map((t) => t.departs_at)].filter((x): x is string => !!x).sort();
  return new Date(c[0] ?? trip.departure_at);
}

/** Día de regreso de UNA persona: su último vuelo/transporte de regreso; si no, el regreso del viaje. Solo la fecha. */
export function personReturn(trip: { return_at: string | null }, legs: PersonLegs = {}): Date | null {
  const c = [...mineOnly(legs.flights, legs.userId).filter((f) => f.leg === "regreso").map((f) => f.departs_at), ...mineOnly(legs.transports, legs.userId).filter((t) => t.leg === "regreso").map((t) => t.departs_at)].sort();
  const last = c.at(-1) ?? trip.return_at;
  return last ? new Date(last) : null;
}

/** Etiqueta del viaje SOLO con el día, nunca la hora: "Sale hoy", "Sale mañana", "Sale el sáb 7", "En curso", "Regresa hoy", "Regresa el lun 9", "Regresó", "Finalizado". */
export function tripDayLabel(
  trip: { status?: string; departure_at: string; return_at: string | null; meeting_at?: string | null },
  legs: PersonLegs = {},
  now = new Date(),
): string {
  if (trip.status === "completado") return "Finalizado";
  const dep = personDeparture(trip, legs);
  const ret = personReturn(trip, legs);
  const d = dayDiff(dep, now);
  if (d === 0) return "Sale hoy";
  if (d === 1) return "Sale mañana";
  if (d > 1) return `Sale el ${shortDay(dep)}`;
  if (!ret) return "En curso";
  const r = dayDiff(ret, now);
  if (r === 0) return "Regresa hoy";
  if (r > 0) return `Regresa el ${shortDay(ret)}`;
  return "Regresó";
}

export type MyItemKind = "cita" | "vuelo" | "transporte" | "comida" | "partido";
/** `locationId` = lugar del catálogo; `address` = dirección escrita. Sin ninguno, el elemento no se puede tocar. */
export interface MyItem { id: string; at: string; kind: MyItemKind; title: string; detail: string | null; locationId: string | null; address: string | null; transportType?: string }

/** Le toca a la persona: sin pasajeros asignados aplica a todos; con pasajeros, solo a ellos. */
export const appliesTo = (passengers: { user_id: string }[] | null | undefined, userId: string) =>
  !passengers || passengers.length === 0 || passengers.some((p) => p.user_id === userId);

export const isTappable = (it: Pick<MyItem, "locationId" | "address">) => !!it.locationId || !!it.address?.trim();

/**
 * Itinerario de UNA persona, en orden de hora. Vuelos: solo si es pasajera.
 * Transportes: todos si no tienen pasajeros, si no solo los suyos. Comidas: aplican a todos.
 * El hotel no entra (sus horas son referencia del staff; se ve en "Mi cuarto").
 */
export function myItinerary(input: {
  userId: string;
  trip: { meeting_at: string | null; meeting_point: string | null; meeting_location_id?: string | null; match_event: { title: string; starts_at: string; location: string | null } | null };
  flights: { id: string; flight_code: string; airline: string | null; origin: string; destination: string; departs_at: string; passengers: { user_id: string }[] }[];
  transports: { id: string; label: string | null; transport_type: string; pickup_location: string; pickup_location_id?: string | null; destination: string; departs_at: string; passengers?: { user_id: string }[] }[];
  meals: { id: string; meal_type: string; scheduled_at: string; location: string | null; passengers?: { user_id: string }[] }[];
  mealLabel?: (t: string) => string;
}): MyItem[] {
  const { userId, trip } = input;
  const out: MyItem[] = [];
  if (trip.meeting_at) out.push({ id: "cita", at: trip.meeting_at, kind: "cita", title: "Reunión del viaje", detail: trip.meeting_point, locationId: trip.meeting_location_id ?? null, address: null });
  for (const f of input.flights) {
    if (!f.passengers.some((p) => p.user_id === userId)) continue;
    out.push({ id: `f-${f.id}`, at: f.departs_at, kind: "vuelo", title: `Vuelo ${f.flight_code}${f.airline ? ` · ${f.airline}` : ""}`, detail: `${f.origin} → ${f.destination}`, locationId: null, address: null });
  }
  for (const t of input.transports) {
    if (!appliesTo(t.passengers, userId)) continue;
    out.push({ id: `t-${t.id}`, at: t.departs_at, kind: "transporte", title: t.label || "Transporte", detail: `${t.pickup_location} → ${t.destination}`, locationId: t.pickup_location_id ?? null, address: null, transportType: t.transport_type });
  }
  for (const m of input.meals) {
    if (!appliesTo(m.passengers, userId)) continue;
    out.push({ id: `m-${m.id}`, at: m.scheduled_at, kind: "comida", title: input.mealLabel?.(m.meal_type) ?? m.meal_type, detail: m.location, locationId: null, address: null });
  }
  if (trip.match_event) out.push({ id: "partido", at: trip.match_event.starts_at, kind: "partido", title: trip.match_event.title, detail: trip.match_event.location, locationId: null, address: trip.match_event.location });
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
