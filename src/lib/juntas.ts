import type { MeetingRow } from "@/hooks/useCoordinacion";

/* ---------------------------- Orden del día ---------------------------- */
// Se guarda como texto legible (también lo muestra Agenda):
// "☐ punto" pendiente · "☑ punto" tratado. Texto viejo: un punto por línea.
export interface AgendaItem { text: string; done: boolean }

export function parseAgenda(raw: string | null | undefined): AgendaItem[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      if (l.startsWith("☑")) return { text: l.slice(1).trim(), done: true };
      if (l.startsWith("☐")) return { text: l.slice(1).trim(), done: false };
      return { text: l.replace(/^[-•*]\s*/, ""), done: false };
    })
    .filter((i) => i.text);
}

export function serializeAgenda(items: AgendaItem[]): string | null {
  const lines = items.filter((i) => i.text.trim()).map((i) => `${i.done ? "☑" : "☐"} ${i.text.trim()}`);
  return lines.length ? lines.join("\n") : null;
}

/* ------------------------------ Listado ------------------------------- */
const HOUR = 60 * 60 * 1000;

/** Fin efectivo: fin programado o una hora después del inicio. */
export function meetingEnd(m: Pick<MeetingRow, "starts_at" | "ends_at">): Date {
  return m.ends_at ? new Date(m.ends_at) : new Date(new Date(m.starts_at).getTime() + HOUR);
}

/** Próxima = en curso, o no finalizada/cancelada y aún no termina. */
export function isUpcoming(m: Pick<MeetingRow, "starts_at" | "ends_at" | "status">, now = new Date()): boolean {
  if (m.status === "en_curso" || m.status === "en_pausa") return true;
  if (m.status === "finalizada" || m.status === "cancelada") return false;
  return meetingEnd(m) >= now;
}

export function splitMeetings<T extends Pick<MeetingRow, "starts_at" | "ends_at" | "status">>(list: T[], now = new Date()) {
  const upcoming = list.filter((m) => isUpcoming(m, now)).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const past = list.filter((m) => !isUpcoming(m, now)).sort((a, b) => b.starts_at.localeCompare(a.starts_at));
  return { upcoming, past };
}

export function confirmedSummary(attendees: { attendance_status: string }[]) {
  const confirmed = attendees.filter((a) => a.attendance_status === "confirmado").length;
  return { confirmed, total: attendees.length, label: `${confirmed} de ${attendees.length} confirmaron` };
}

export function groupByResponse<T extends { attendance_status: string }>(attendees: T[]) {
  return {
    yes: attendees.filter((a) => a.attendance_status === "confirmado"),
    no: attendees.filter((a) => a.attendance_status === "rechazado"),
    pending: attendees.filter((a) => a.attendance_status !== "confirmado" && a.attendance_status !== "rechazado"),
  };
}

/** "10:00 – 11:00 am" · "11:30 am – 1:00 pm" */
export function timeRange(startIso: string, endIso: string | null): string {
  const fmt = (d: Date) => {
    const h = d.getHours();
    return { t: `${h % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")}`, ap: h < 12 ? "am" : "pm" };
  };
  const s = fmt(new Date(startIso));
  if (!endIso) return `${s.t} ${s.ap}`;
  const e = fmt(new Date(endIso));
  return s.ap === e.ap ? `${s.t} – ${e.t} ${e.ap}` : `${s.t} ${s.ap} – ${e.t} ${e.ap}`;
}

/* ------------------------------ Mapas -------------------------------- */
export function mapsLinks(loc: { latitude: number | null; longitude: number | null; address: string | null; name: string; place_id?: string | null; source?: string | null }) {
  const hasCoords = loc.latitude != null && loc.longitude != null;
  const text = encodeURIComponent(loc.address || loc.name);
  const pid = loc.place_id && loc.source === "google" ? `&query_place_id=${encodeURIComponent(loc.place_id)}` : "";
  return {
    google: hasCoords
      ? `https://www.google.com/maps/search/?api=1&query=${loc.latitude},${loc.longitude}${pid}`
      : `https://www.google.com/maps/search/?api=1&query=${text}`,
    waze: hasCoords ? `https://waze.com/ul?ll=${loc.latitude},${loc.longitude}&navigate=yes` : `https://waze.com/ul?q=${text}&navigate=yes`,
  };
}
