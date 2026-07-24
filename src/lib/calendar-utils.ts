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

/** Returns a 6x7 grid of days for the month containing `anchor`, starting Monday. */
export function monthGrid(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  // Convert Sunday=0 → Monday=0
  const dow = (first.getDay() + 6) % 7;
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

export function formatDayLabel(d: Date) {
  return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
}

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
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
