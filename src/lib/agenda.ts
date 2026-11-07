/**
 * Reglas de la Agenda (vitrina): qué eventos ve la persona, cómo se agrupan
 * por día y cuál es el evento protagonista. Funciones puras.
 */
export type AgendaKind = "partido" | "entrenamiento" | "viaje" | "junta" | "evento";
export const AGENDA_KINDS: { key: AgendaKind; label: string }[] = [
  { key: "partido", label: "Partido" },
  { key: "entrenamiento", label: "Entrenamiento" },
  { key: "viaje", label: "Viaje" },
  { key: "junta", label: "Junta" },
  { key: "evento", label: "Evento" },
];

interface Ev { event_type: string; team_id: string | null; starts_at: string; trip_id?: string | null }

export function agendaKind(e: { event_type: string; trip_id?: string | null }): AgendaKind {
  if (e.trip_id || e.event_type === "viaje") return "viaje";
  if (e.event_type === "partido" || e.event_type === "entrenamiento" || e.event_type === "junta") return e.event_type;
  return "evento";
}

/**
 * Solo categorías de la persona (más "Todo el club"). `category` null =
 * todas sus categorías. `kinds` vacío = todos los tipos.
 */
export function filterAgenda<T extends Ev>(events: T[], myTeamIds: string[], category: string | null, kinds: AgendaKind[]): T[] {
  const mine = new Set(myTeamIds);
  return events.filter((e) => {
    if (e.team_id) {
      if (!mine.has(e.team_id)) return false;
      if (category && e.team_id !== category) return false;
    }
    return kinds.length === 0 || kinds.includes(agendaKind(e));
  });
}

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Agrupa por día local, desde hoy hasta `days` días adelante (incluye hoy). */
export function groupByDay<T extends Ev>(events: T[], days: number, now: Date = new Date()) {
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = new Date(from);
  to.setDate(to.getDate() + days);
  const map = new Map<string, { date: Date; events: T[] }>();
  for (const e of events) {
    const at = new Date(e.starts_at);
    if (at < from || at >= to) continue;
    const d = new Date(at.getFullYear(), at.getMonth(), at.getDate());
    const k = dayKey(d);
    const g = map.get(k) ?? { date: d, events: [] };
    g.events.push(e);
    map.set(k, g);
  }
  return [...map.values()]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((g) => ({ ...g, events: g.events.sort((a, b) => a.starts_at.localeCompare(b.starts_at)) }));
}

/** ¿Hay más eventos después de la ventana visible? */
export function hasMoreAfter(events: Ev[], days: number, now: Date = new Date()) {
  const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return events.some((e) => new Date(e.starts_at) >= to);
}

/**
 * Protagonista: próximo partido en 7 días; si no, próximo viaje donde viaja
 * la persona; si no, el próximo evento.
 */
export function pickHero<T extends Ev>(events: T[], myTripEventIds: Set<string> | ((e: T) => boolean), now: Date = new Date()): T | null {
  const future = events
    .filter((e) => new Date(e.starts_at) >= now || agendaKind(e) === "viaje" && new Date(e.starts_at) >= new Date(now.getFullYear(), now.getMonth(), now.getDate()))
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const week = now.getTime() + 7 * 864e5;
  const match = future.find((e) => agendaKind(e) === "partido" && new Date(e.starts_at).getTime() <= week);
  if (match) return match;
  const travels = typeof myTripEventIds === "function" ? myTripEventIds : (e: T) => myTripEventIds.has((e as any).id);
  const trip = future.find((e) => agendaKind(e) === "viaje" && travels(e));
  return trip ?? future[0] ?? null;
}

/** Hora para la fila (zona del club): { time:"5:15", ampm:"am" } o null si es todo el día. */
export function rowTime(e: { starts_at: string; event_type: string; trip_id?: string | null }, timeZone?: string) {
  if (agendaKind(e) === "viaje") return null;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit", hour12: true }).formatToParts(new Date(e.starts_at));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return { time: `${get("hour")}:${get("minute")}`, ampm: get("dayPeriod").toLowerCase() };
}

/* ---------- Tira de la semana ---------- */

/** Lunes (00:00 local) de la semana de `d`. */
export function weekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  return x;
}

/** Los 7 días (lunes a domingo) a partir de `start`. */
export function weekDays(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

export const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const agendaDayKey = dayKey;

/** Puntos del día: partido primero (verde), luego el resto (gris); máximo 3. */
export function dayDots(events: { event_type: string; trip_id?: string | null; starts_at: string }[], day: Date): ("partido" | "otro")[] {
  const kinds = events.filter((e) => sameDay(new Date(e.starts_at), day)).map((e) => (agendaKind(e) === "partido" ? "partido" as const : "otro" as const));
  kinds.sort((a, b) => (a === b ? 0 : a === "partido" ? -1 : 1));
  return kinds.slice(0, 3);
}

/* ---------- Momentos clave de un viaje ---------- */

export interface MomentFlight { id: string; leg: "ida" | "regreso"; origin: string; destination: string; departs_at: string; arrives_at: string | null; flight_code: string }
export interface TripMoment { key: string; leg: "ida" | "regreso"; at: string; flight: MomentFlight | null }

/**
 * Salida (o vuelo de ida, el primero) y regreso (o vuelo de regreso, el primero).
 * Sin regreso (ni vuelo ni fecha) solo hay tarjeta de salida.
 */
export function tripMoments(trip: { id: string; departure_at: string; return_at: string | null }, flights: MomentFlight[]): TripMoment[] {
  const first = (leg: "ida" | "regreso") => flights.filter((f) => f.leg === leg).sort((a, b) => a.departs_at.localeCompare(b.departs_at))[0] ?? null;
  const ida = first("ida");
  const vuelta = first("regreso");
  const out: TripMoment[] = [{ key: `${trip.id}:ida`, leg: "ida", at: ida?.departs_at ?? trip.departure_at, flight: ida }];
  const backAt = vuelta?.departs_at ?? trip.return_at;
  if (backAt) out.push({ key: `${trip.id}:regreso`, leg: "regreso", at: backAt, flight: vuelta });
  return out;
}
