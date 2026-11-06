/** Reglas puras del módulo Tareas (Coordinación › General). Sin React ni red. */

export type WhenGroup = "vencidas" | "hoy" | "semana" | "despues" | "sin_fecha" | "hechas";

export const WHEN_GROUPS: { key: WhenGroup; label: string }[] = [
  { key: "vencidas", label: "Vencidas" },
  { key: "hoy", label: "Hoy" },
  { key: "semana", label: "Esta semana" },
  { key: "despues", label: "Después" },
  { key: "sin_fecha", label: "Sin fecha" },
  { key: "hechas", label: "Hechas" },
];

export interface TaskLike {
  status: string;
  due_at: string | null;
  completed_at?: string | null;
  assignees?: { id: string }[];
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** Fin de la semana actual (domingo 23:59:59.999, semana de lunes a domingo). */
export function endOfWeek(now: Date) {
  const dow = (now.getDay() + 6) % 7; // lunes = 0
  const end = addDays(startOfDay(now), 7 - dow);
  return new Date(end.getTime() - 1);
}

export function whenGroup(t: TaskLike, now = new Date()): WhenGroup {
  if (t.status === "completada") return "hechas";
  if (!t.due_at) return "sin_fecha";
  const due = new Date(t.due_at);
  if (due.getTime() < now.getTime()) return "vencidas";
  if (due < addDays(startOfDay(now), 1)) return "hoy";
  if (due <= endOfWeek(now)) return "semana";
  return "despues";
}

/** "Hechas" solo muestra las de las últimas 2 semanas salvo "Ver anteriores". */
export function isRecentDone(t: TaskLike, now = new Date()) {
  if (t.status !== "completada") return false;
  const at = t.completed_at ? new Date(t.completed_at).getTime() : 0;
  return at >= now.getTime() - 14 * 86_400_000;
}

const time = (d: Date) =>
  d.toLocaleTimeString("es-MX", { hour: "numeric", minute: "2-digit", hour12: true }).replace(/\s?a\.?\s?m\.?/i, " am").replace(/\s?p\.?\s?m\.?/i, " pm");
const WEEKDAY = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const MONTH = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** Fecha relativa corta: "Hoy 6:00 pm", "Vence mañana", "Venció ayer", "Vie 5:00 pm", "12 nov". */
export function dueLabel(dueAt: string | null, now = new Date()): string | null {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  const days = Math.round((startOfDay(due).getTime() - startOfDay(now).getTime()) / 86_400_000);
  if (days === 0) return due < now ? `Venció hoy ${time(due)}` : `Hoy ${time(due)}`;
  if (days === 1) return "Vence mañana";
  if (days === -1) return "Venció ayer";
  if (days < -1) return `Venció hace ${-days} días`;
  if (days < 7) return `${WEEKDAY[due.getDay()]} ${time(due)}`;
  return `${due.getDate()} ${MONTH[due.getMonth()]}`;
}

export const isMine = (t: TaskLike, userId: string) => (t.assignees ?? []).some((a) => a.id === userId);

export type Urgency = "red" | "amber" | "gray";

/** Resumen para Pendientes de General: mis tareas no hechas. */
export function myTasksSummary(tasks: TaskLike[], userId: string, now = new Date()) {
  const open = tasks.filter((t) => t.status !== "completada" && isMine(t, userId));
  const overdue = open.filter((t) => whenGroup(t, now) === "vencidas").length;
  const today = open.filter((t) => whenGroup(t, now) === "hoy").length;
  const urgency: Urgency = overdue > 0 ? "red" : today > 0 ? "amber" : "gray";
  const context =
    overdue > 0
      ? `${overdue} ${overdue === 1 ? "vencida" : "vencidas"}`
      : today > 0
        ? `${today} ${today === 1 ? "vence" : "vencen"} hoy`
        : open.length > 0
          ? "Sin vencimientos hoy"
          : "Nada pendiente";
  return { count: open.length, overdue, today, urgency, context };
}

/** Orden dentro de un grupo: fecha más próxima primero, luego prioridad. */
const PRI: Record<string, number> = { urgente: 0, alta: 1, media: 2, baja: 3 };
export function sortTasks<T extends TaskLike & { priority?: string; created_at?: string }>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    const da = a.due_at ? new Date(a.due_at).getTime() : Infinity;
    const db = b.due_at ? new Date(b.due_at).getTime() : Infinity;
    if (da !== db) return da - db;
    return (PRI[a.priority ?? "media"] ?? 2) - (PRI[b.priority ?? "media"] ?? 2);
  });
}

/** Una tarea que pide foto no se puede completar sin evidencia (espejo de la regla en la base). */
export const canCompleteTask = (requiresEvidence: boolean, evidenceCount: number) => !requiresEvidence || evidenceCount > 0;
