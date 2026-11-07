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

/** Hora para la fila: { time:"5:15", ampm:"am" } o null si es todo el día. */
export function rowTime(e: { starts_at: string; event_type: string; trip_id?: string | null }) {
  if (agendaKind(e) === "viaje") return null;
  const d = new Date(e.starts_at);
  let h = d.getHours();
  const ampm = h < 12 ? "am" : "pm";
  h = h % 12 || 12;
  return { time: `${h}:${String(d.getMinutes()).padStart(2, "0")}`, ampm };
}
