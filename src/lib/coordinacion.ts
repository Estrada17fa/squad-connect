import type { TaskPriority, TaskStatus, MeetingStatus, AttendanceStatus } from "@/hooks/useCoordinacion";

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  baja: "Baja",
  media: "Media",
  alta: "Alta",
  urgente: "Urgente",
};

/** Barra/punto de color por prioridad (tokens semánticos, sin colores crudos). */
export const PRIORITY_DOT: Record<TaskPriority, string> = {
  baja: "bg-status-info",
  media: "bg-status-pending",
  alta: "bg-status-rejected",
  urgente: "bg-destructive",
};

export const PRIORITY_ORDER: TaskPriority[] = ["urgente", "alta", "media", "baja"];

export const STATUS_LABEL: Record<TaskStatus, string> = {
  pendiente: "Por hacer",
  en_progreso: "En progreso",
  en_pausa: "En pausa",
  completada: "Hecha",
};

export const MEETING_STATUS_LABEL: Record<MeetingStatus, string> = {
  programada: "Programada",
  en_curso: "En curso",
  en_pausa: "En pausa",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  invitado: "Sin responder",
  confirmado: "Confirmado",
  rechazado: "No asiste",
};

export function initialsOf(name?: string | null, email?: string | null) {
  const base = (name ?? email ?? "?").trim();
  const parts = base.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return base.slice(0, 2).toUpperCase();
}
