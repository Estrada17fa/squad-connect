export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function addMonths(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(1);
  x.setMonth(x.getMonth() + n);
  return x;
}

/** Primer día de la semana configurado por el club: 1 = lunes, 0 = domingo. */
let clubWeekStart: 0 | 1 = 1;

export function setClubWeekStart(value: number | null | undefined) {
  clubWeekStart = value === 0 ? 0 : 1;
}

export function getClubWeekStart(): 0 | 1 {
  return clubWeekStart;
}

const WEEKDAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** Cabeceras de días respetando el primer día de la semana del club. */
export function weekdayLabels(): string[] {
  return Array.from({ length: 7 }, (_, i) => WEEKDAY_LABELS[(clubWeekStart + i) % 7]);
}

/** Returns a 6x7 grid of days for the month containing `anchor`. */
export function monthGrid(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const dow = (first.getDay() - clubWeekStart + 7) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - dow);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function monthLabel(d: Date) {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Preferencias de visualización del club (zona horaria y formato de fecha).
 * Se actualizan desde `useClubPrefs()` y las usan los formateadores de abajo.
 */
let clubTimeZone: string | undefined;
let clubDateFormat = "dd/MM/yyyy";

export function setClubDatePrefs(prefs: { timezone?: string | null; dateFormat?: string | null }) {
  clubTimeZone = prefs.timezone || undefined;
  clubDateFormat = prefs.dateFormat || "dd/MM/yyyy";
}

export function getClubTimeZone() {
  return clubTimeZone;
}

/** Fecha corta respetando el formato configurado por el club. */
export function formatShortDate(value: string | Date) {
  const d = typeof value === "string" ? new Date(value) : value;
  const parts = new Intl.DateTimeFormat("es-MX", {
    timeZone: clubTimeZone,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .formatToParts(d)
    .reduce<Record<string, string>>((acc, p) => ({ ...acc, [p.type]: p.value }), {});
  if (clubDateFormat === "MM/dd/yyyy") return `${parts.month}/${parts.day}/${parts.year}`;
  if (clubDateFormat === "yyyy-MM-dd") return `${parts.year}-${parts.month}-${parts.day}`;
  return `${parts.day}/${parts.month}/${parts.year}`;
}

export function formatDayLabel(d: Date) {
  return d.toLocaleDateString("es-MX", {
    timeZone: clubTimeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** "HOY", "MAÑANA" o "Vie 15 ago" — encabezado de día de la Agenda. */
export function formatRelativeDayLabel(d: Date) {
  const today = startOfDay(new Date());
  const target = startOfDay(d);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "HOY";
  if (diff === 1) return "MAÑANA";
  if (diff === -1) return "AYER";
  const label = target.toLocaleDateString("es-MX", {
    timeZone: clubTimeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return label.replace(/\./g, "");
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", {
    timeZone: clubTimeZone,
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    timeZone: clubTimeZone,
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}


/** Convert an ISO timestamptz to a value acceptable by <input type="datetime-local"> (local time). */
export function toLocalInputValue(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

/** Convert a datetime-local value ("YYYY-MM-DDTHH:mm") back to an ISO timestamptz string. */
export function fromLocalInputValue(v: string): string {
  return new Date(v).toISOString();
}

/**
 * Fecha sin hora para el rango general de un viaje ("vie 28 de ago").
 * El viaje solo captura fechas: mostrar una hora ahí sería un placeholder falso.
 */
export function formatDateOnly(iso: string) {
  const label = new Date(iso).toLocaleDateString("es-MX", {
    timeZone: clubTimeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return label.replace(/\./g, "");
}

/** Día del club en formato "YYYY-MM-DD", para comparar fechas con la zona del club. */
function clubDayKey(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: clubTimeZone });
}

/** true cuando ambas marcas caen el mismo día en la zona del club. */
export function isSameClubDay(a: string, b: string) {
  return clubDayKey(a) === clubDayKey(b);
}

/**
 * Rango de un viaje sin horas: "vie 28 ago" o "vie 28 ago → dom 30 ago".
 * Los viajes solo capturan fechas, nunca hora.
 */
export function formatTripRange(startIso: string, endIso?: string | null) {
  const from = formatDateOnly(startIso);
  if (!endIso || isSameClubDay(startIso, endIso)) return from;
  return `${from} → ${formatDateOnly(endIso)}`;
}

/** Día compacto para la columna izquierda de la tarjeta: "VIE 28". */
export function formatDayChip(iso: string) {
  const label = new Date(iso).toLocaleDateString("es-MX", {
    timeZone: clubTimeZone,
    weekday: "short",
    day: "numeric",
  });
  return label.replace(/\./g, "").toUpperCase();
}

