// Datos de EJEMPLO para el nuevo look de Coordinación. Reemplazar por datos reales después.
import { ListChecks, Inbox, Megaphone, LineChart, Dumbbell, HeartPulse, CalendarClock, type LucideIcon } from "lucide-react";
import type { AreaKey } from "./coordAreas";

export interface MockHero { label: string; title: string; support: string; cta: string }
export const AREA_HERO: Record<AreaKey, MockHero> = {
  general: { label: "PRÓXIMO VIAJE", title: "Tuxtepec · en 3 días", support: "2 pendientes de logística", cta: "Ver viaje" },
  tecnica: { label: "PRÓXIMO PARTIDO", title: "Sáb 7:00 pm · vs Racing", support: "Convocatoria sin publicar", cta: "Armar convocatoria" },
  medica: { label: "HOY", title: "Revisión 5:00 pm", support: "2 jugadores lesionados", cta: "Ver lesionados" },
};

export interface MockPending { icon: LucideIcon; text: string; value: string }
export const AREA_PENDING: Record<AreaKey, MockPending[]> = {
  general: [
    { icon: ListChecks, text: "Tareas pendientes", value: "4" },
    { icon: Inbox, text: "Solicitudes por responder", value: "2" },
    { icon: Megaphone, text: "Comunicados sin leer", value: "1" },
  ],
  tecnica: [
    { icon: LineChart, text: "Evaluaciones por hacer", value: "3" },
    { icon: Dumbbell, text: "Entrenamiento hoy", value: "7:00 am" },
  ],
  medica: [
    { icon: HeartPulse, text: "Lesionados", value: "2" },
    { icon: CalendarClock, text: "Citas de hoy", value: "1" },
  ],
};

export interface MockStat { value: string; label: string }

export const AREA_SUMMARY: Record<AreaKey, MockStat[]> = {
  general: [
    { value: "4", label: "tareas pendientes" },
    { value: "2", label: "solicitudes por responder" },
    { value: "3 días", label: "para el viaje" },
  ],
  tecnica: [
    { value: "Sáb", label: "vs Racing" },
    { value: "7:00", label: "entreno hoy" },
    { value: "3", label: "evaluaciones" },
  ],
  medica: [
    { value: "2", label: "lesionados" },
    { value: "1", label: "cita hoy" },
  ],
};

export const QUICK_ACTIONS: Record<AreaKey, string[]> = {
  general: ["Tarea", "Comunicado"],
  tecnica: ["Convocatoria", "Entrenamiento"],
  medica: ["Lesión", "Cita"],
};

export interface MockModule {
  hint: string;
  badge?: number;
  stats: MockStat[];
  tabs?: string[];
  empty: string;
  /** Botón del estado vacío; sin valor = sin botón. */
  emptyCta?: string;
  action: string;
}

export const MODULE_MOCK: Record<string, MockModule> = {
  tareas: { hint: "4 pendientes", badge: 4, stats: [{ value: "4", label: "pendientes" }, { value: "1", label: "junta hoy" }], tabs: ["Tareas", "Juntas"], empty: "Crea la primera tarea del staff", emptyCta: "Nueva tarea", action: "Tarea" },
  comunicados: { hint: "1 sin leer", stats: [{ value: "1", label: "sin leer" }, { value: "6", label: "este mes" }], empty: "Publica el primer comunicado del club", emptyCta: "Nuevo comunicado", action: "Comunicado" },
  multimedia: { hint: "12 fotos", stats: [{ value: "12", label: "fotos" }, { value: "3", label: "videos" }], empty: "Sube las primeras fotos o videos", emptyCta: "Subir archivo", action: "Subir" },
  solicitudes: { hint: "2 por responder", badge: 2, stats: [{ value: "2", label: "por responder" }, { value: "5", label: "aprobadas" }], tabs: ["Recibidas", "Mías"], empty: "Aquí verás las solicitudes por responder", action: "Solicitud" },
  viajes: { hint: "En 3 días", stats: [{ value: "3 días", label: "próximo viaje" }, { value: "24", label: "viajeros" }], empty: "Organiza el próximo viaje del equipo", emptyCta: "Nuevo viaje", action: "Viaje" },
  eventos: { hint: "Próximamente", stats: [], empty: "Muy pronto", action: "Evento" },
  plantel: { hint: "61 personas", stats: [{ value: "48", label: "jugadores" }, { value: "13", label: "staff" }], tabs: ["Jugadores", "Staff"], empty: "Agrega a tu primer jugador", emptyCta: "Agregar jugador", action: "Agregar" },
  partidos: { hint: "Sáb · vs Racing", stats: [{ value: "Sáb", label: "vs Racing" }, { value: "3-1", label: "último" }], tabs: ["Próximos", "Jugados"], empty: "Programa el próximo partido", emptyCta: "Nuevo partido", action: "Partido" },
  entrenamientos: { hint: "Hoy 7:00 am", stats: [{ value: "7:00", label: "hoy" }, { value: "5", label: "esta semana" }], empty: "Planea el primer entrenamiento", emptyCta: "Nuevo entrenamiento", action: "Entrenamiento" },
  evaluaciones: { hint: "3 pendientes", badge: 3, stats: [{ value: "3", label: "pendientes" }], empty: "Aquí verás las evaluaciones pendientes", action: "Evaluación" },
  torneo: { hint: "4º lugar", stats: [{ value: "4º", label: "posición" }, { value: "22", label: "puntos" }], empty: "Aquí verás la tabla y los resultados", action: "Agregar" },
  utileria: { hint: "86 artículos", stats: [{ value: "86", label: "artículos" }, { value: "4", label: "por reponer" }], empty: "Registra el primer artículo de utilería", emptyCta: "Agregar artículo", action: "Artículo" },
  salud: { hint: "2 lesionados", badge: 2, stats: [{ value: "2", label: "lesionados" }, { value: "1", label: "cita hoy" }], tabs: ["Lesiones", "Citas"], empty: "Registra la primera lesión o cita", emptyCta: "Nuevo registro", action: "Lesión" },
  nutricion: { hint: "3 planes", stats: [{ value: "3", label: "planes activos" }], empty: "Crea el primer plan de nutrición", emptyCta: "Nuevo plan", action: "Plan" },
};

export const MOCK_CATEGORY = "Primer Equipo";
