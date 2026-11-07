/**
 * Reglas del módulo Viajes (Coordinación › General): preparación del viaje,
 * itinerario, cuenta regresiva y a dónde lleva un enlace de viaje.
 * Funciones puras: no tocan la base ni el navegador.
 */

export interface ReadinessTraveler { user_id: string }
export interface ReadinessFlight {
  id: string;
  leg: "ida" | "regreso";
  passengers: { user_id: string }[];
  boarding_passes: { user_id: string | null }[];
}
export interface ReadinessHotel { rooms: { occupants: { user_id: string }[] }[] }
export interface ReadinessTransport { leg: "ida" | "regreso"; passengers: { user_id: string }[] }

export type TripSection = "resumen" | "viajeros" | "vuelos" | "hotel" | "transporte" | "comidas" | "equipaje" | "documentos";
export const TRIP_SECTIONS: { key: TripSection; label: string }[] = [
  { key: "resumen", label: "Resumen" },
  { key: "viajeros", label: "Viajeros" },
  { key: "vuelos", label: "Vuelos" },
  { key: "hotel", label: "Hotel" },
  { key: "transporte", label: "Transporte" },
  { key: "comidas", label: "Comidas" },
  { key: "equipaje", label: "Equipaje" },
  { key: "documentos", label: "Documentos" },
];
export function isTripSection(v: unknown): v is TripSection {
  return TRIP_SECTIONS.some((s) => s.key === v);
}

export interface TravelerStatus {
  /** null = no aplica (el viaje no tiene vuelos / hotel / transporte). */
  flight: boolean | null;
  pass: boolean | null;
  room: boolean | null;
  transport: boolean | null;
}

export interface ReadinessGap { key: "vuelo" | "pase" | "cuarto" | "transporte_ida" | "transporte_regreso"; count: number; label: string; section: TripSection }

export interface Readiness {
  percent: number;
  done: number;
  total: number;
  ready: boolean;
  gaps: ReadinessGap[];
  byTraveler: Record<string, TravelerStatus>;
}

const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

/**
 * Preparación: por cada viajero se revisa lo que el viaje sí tiene registrado.
 * - Vuelo: si hay vuelos, debe ir en al menos uno.
 * - Pase: en cada vuelo donde va, debe tener su pase.
 * - Cuarto: si hay hotel con cuartos, debe estar en uno.
 * - Transporte: por cada tramo (ida/regreso) con transportes, debe ir en uno.
 */
export function computeReadiness(
  travelers: ReadinessTraveler[],
  flights: ReadinessFlight[],
  hotels: ReadinessHotel[],
  transports: ReadinessTransport[],
): Readiness {
  const rooms = hotels.flatMap((h) => h.rooms);
  const legsWithTransport = (["ida", "regreso"] as const).filter((l) => transports.some((t) => t.leg === l));
  let done = 0;
  let total = 0;
  const miss = { vuelo: 0, pase: 0, cuarto: 0, transporte_ida: 0, transporte_regreso: 0 };
  const byTraveler: Record<string, TravelerStatus> = {};

  for (const { user_id: uid } of travelers) {
    const st: TravelerStatus = { flight: null, pass: null, room: null, transport: null };
    if (flights.length) {
      const mine = flights.filter((f) => f.passengers.some((p) => p.user_id === uid));
      st.flight = mine.length > 0;
      total++;
      if (st.flight) done++; else miss.vuelo++;
      if (mine.length) {
        const missing = mine.filter((f) => !f.boarding_passes.some((bp) => bp.user_id === uid)).length;
        total += mine.length;
        done += mine.length - missing;
        st.pass = missing === 0;
        if (missing) miss.pase++;
      }
    }
    if (rooms.length) {
      st.room = rooms.some((r) => r.occupants.some((o) => o.user_id === uid));
      total++;
      if (st.room) done++; else miss.cuarto++;
    }
    if (legsWithTransport.length) {
      let ok = true;
      for (const leg of legsWithTransport) {
        total++;
        const has = transports.some((t) => t.leg === leg && t.passengers.some((p) => p.user_id === uid));
        if (has) done++;
        else { ok = false; miss[leg === "ida" ? "transporte_ida" : "transporte_regreso"]++; }
      }
      st.transport = ok;
    }
    byTraveler[uid] = st;
  }

  const gaps: ReadinessGap[] = [];
  if (miss.vuelo) gaps.push({ key: "vuelo", count: miss.vuelo, label: `${plural(miss.vuelo, "sin vuelo", "sin vuelo")}`, section: "vuelos" });
  if (miss.pase) gaps.push({ key: "pase", count: miss.pase, label: `${miss.pase} sin pase de abordar`, section: "vuelos" });
  if (miss.cuarto) gaps.push({ key: "cuarto", count: miss.cuarto, label: `${miss.cuarto} sin cuarto`, section: "hotel" });
  if (miss.transporte_ida) gaps.push({ key: "transporte_ida", count: miss.transporte_ida, label: `${miss.transporte_ida} sin transporte de ida`, section: "transporte" });
  if (miss.transporte_regreso) gaps.push({ key: "transporte_regreso", count: miss.transporte_regreso, label: `${miss.transporte_regreso} sin transporte de regreso`, section: "transporte" });

  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  return { percent, done, total, ready: total > 0 && done === total, gaps, byTraveler };
}

/** Pendientes totales (para el globito del mosaico). */
export function gapCount(r: Readiness) {
  return r.gaps.reduce((n, g) => n + g.count, 0);
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Días de calendario entre hoy y la fecha (0 = hoy, 1 = mañana, negativo = ya pasó). */
export function daysUntil(iso: string, now: Date = new Date()) {
  return Math.round((startOfDay(new Date(iso)) - startOfDay(now)) / 86_400_000);
}

/** "Sale hoy" · "Sale mañana" · "Sale en 3 días" · "En curso" · "Regresó". */
export function departureLabel(departureIso: string, returnIso: string | null, now: Date = new Date()) {
  const d = daysUntil(departureIso, now);
  if (d > 1) return `Sale en ${d} días`;
  if (d === 1) return "Sale mañana";
  if (d === 0) return "Sale hoy";
  const back = returnIso ? daysUntil(returnIso, now) : d;
  return back >= 0 ? "En curso" : "Regresó";
}

/** "en 3 días" / "mañana" / "hoy" para la portada de General. */
export function inDaysShort(departureIso: string, now: Date = new Date()) {
  const d = daysUntil(departureIso, now);
  if (d > 1) return `En ${d} días`;
  if (d === 1) return "Mañana";
  if (d === 0) return "Hoy";
  return "En curso";
}

/* ───────────── Estados ─────────────
 * Guardado: planeacion (Borrador) · confirmado (Publicado) · en_curso · completado (Finalizado).
 * Las fechas nunca ocultan un viaje: solo "Finalizar" lo saca de Próximos.
 * "En curso" en pantalla se calcula (Publicado y hoy entre salida y regreso, día completo). */
export type StoredTripStatus = "planeacion" | "confirmado" | "en_curso" | "completado";
export type TripDisplayStatus = "borrador" | "publicado" | "en_curso" | "finalizado";
export const TRIP_DISPLAY_LABEL: Record<TripDisplayStatus, string> = {
  borrador: "Borrador",
  publicado: "Publicado",
  en_curso: "En curso",
  finalizado: "Finalizado",
};
type StatusTrip = { status: StoredTripStatus; departure_at: string; return_at: string | null };

export function tripDisplayStatus(t: StatusTrip, now: Date = new Date()): TripDisplayStatus {
  if (t.status === "completado") return "finalizado";
  if (t.status === "planeacion") return "borrador";
  const started = daysUntil(t.departure_at, now) <= 0;
  const notBack = daysUntil(t.return_at ?? t.departure_at, now) >= 0;
  if (t.status === "en_curso" || (started && notBack)) return "en_curso";
  return "publicado";
}

/** Los viajeros solo ven viajes Publicados, En curso o Finalizados (nunca Borradores). */
export function isPlayerVisible(t: { status: StoredTripStatus }) {
  return t.status !== "planeacion";
}

const byDepAsc = <T extends { departure_at: string }>(a: T, b: T) => a.departure_at.localeCompare(b.departure_at);
const byDepDesc = <T extends { departure_at: string }>(a: T, b: T) => b.departure_at.localeCompare(a.departure_at);

/** Vista del jugador: Próximos (Publicado/En curso, sin filtrar por fecha) y Viajes anteriores (Finalizados). */
export function splitPlayerTrips<T extends { status: StoredTripStatus; departure_at: string }>(trips: T[]) {
  const upcoming = trips.filter((t) => t.status === "confirmado" || t.status === "en_curso").sort(byDepAsc);
  const past = trips.filter((t) => t.status === "completado").sort(byDepDesc);
  return { upcoming, past };
}

/** Coordinación: Próximos (Borrador, Publicado, En curso) y Finalizados. */
export function splitTrips<T extends { status: StoredTripStatus; departure_at: string }>(trips: T[]) {
  const upcoming = trips.filter((t) => t.status !== "completado").sort(byDepAsc);
  const past = trips.filter((t) => t.status === "completado").sort(byDepDesc);
  return { upcoming, past };
}

/** Grupo del viajero según su rol en la categoría del viaje: Jugador → jugadores; el resto → staff. */
export function travelerGroup(roleName: string | null | undefined): "jugadores" | "staff" {
  return (roleName ?? "").trim().toLowerCase() === "jugador" ? "jugadores" : "staff";
}

/**
 * A dónde lleva un enlace o aviso de viaje: quien gestiona viajes va a la
 * ficha de Coordinación; los demás (jugador, Sin acceso) a Agenda › Viajes.
 */
export function tripLinkFor(canManage: boolean, tripId: string | null | undefined) {
  if (canManage) {
    return tripId
      ? ({ kind: "coord", to: "/coordinacion/general/viajes/$tripId", tripId } as const)
      : ({ kind: "coord-list", to: "/coordinacion/general/viajes" } as const);
  }
  return { kind: "agenda", to: "/agenda-viajes", open: tripId ?? undefined } as const;
}

export interface ItineraryItem { id: string; at: string; kind: "cita" | "salida" | "vuelo" | "transporte" | "hotel" | "comida" | "partido" | "regreso"; title: string; detail?: string | null }

/** Itinerario completo ordenado por hora. */
export function buildItinerary(input: {
  trip: { id: string; departure_at: string; return_at: string | null; meeting_at: string | null; meeting_point: string | null; match_event: { title: string; starts_at: string; location: string | null } | null };
  flights: { id: string; leg: string; flight_code: string; airline: string | null; origin: string; destination: string; departs_at: string }[];
  transports: { id: string; departs_at: string; label: string | null; pickup_location: string; destination: string }[];
  hotels: { id: string; name: string; check_in_at: string; check_out_at: string | null }[];
  meals: { id: string; meal_type: string; scheduled_at: string; location: string | null }[];
  mealLabel?: (t: string) => string;
}): ItineraryItem[] {
  const { trip } = input;
  const out: ItineraryItem[] = [];
  if (trip.meeting_at) out.push({ id: "cita", at: trip.meeting_at, kind: "cita", title: "Cita", detail: trip.meeting_point });
  for (const f of input.flights) out.push({ id: `f-${f.id}`, at: f.departs_at, kind: "vuelo", title: `Vuelo ${f.flight_code}${f.airline ? ` · ${f.airline}` : ""}`, detail: `${f.origin} → ${f.destination}` });
  for (const t of input.transports) out.push({ id: `t-${t.id}`, at: t.departs_at, kind: "transporte", title: t.label || "Transporte", detail: `${t.pickup_location} → ${t.destination}` });
  for (const h of input.hotels) {
    out.push({ id: `hi-${h.id}`, at: h.check_in_at, kind: "hotel", title: `Entrada a ${h.name}` });
    if (h.check_out_at) out.push({ id: `ho-${h.id}`, at: h.check_out_at, kind: "hotel", title: `Salida de ${h.name}` });
  }
  for (const m of input.meals) out.push({ id: `m-${m.id}`, at: m.scheduled_at, kind: "comida", title: input.mealLabel?.(m.meal_type) ?? m.meal_type, detail: m.location });
  if (trip.match_event) out.push({ id: "partido", at: trip.match_event.starts_at, kind: "partido", title: trip.match_event.title, detail: trip.match_event.location });
  return out.sort((a, b) => a.at.localeCompare(b.at));
}

/**
 * Agenda: un evento ligado a un viaje solo se muestra si el viaje está
 * Publicado, En curso o Finalizado y la persona puede leer el viaje
 * (trip = null cuando la RLS no lo deja ver). Los demás eventos pasan.
 */
export function isAgendaVisible(e: { trip_id?: string | null; trip?: { status: StoredTripStatus } | null }) {
  if (!e.trip_id) return true;
  return !!e.trip && isPlayerVisible(e.trip);
}
