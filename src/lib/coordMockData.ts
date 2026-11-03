// Datos de EJEMPLO para el nuevo look de Coordinación. Reemplazar por datos reales después.
import type { AreaKey } from "./coordAreas";

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
  action: string;
}

export const MODULE_MOCK: Record<string, MockModule> = {
  tareas: { hint: "4 pendientes", badge: 4, stats: [{ value: "4", label: "pendientes" }, { value: "1", label: "junta hoy" }], tabs: ["Tareas", "Juntas"], empty: "Aquí vas a ver las tareas y juntas del staff", action: "Tarea" },
  comunicados: { hint: "1 sin leer", stats: [{ value: "1", label: "sin leer" }, { value: "6", label: "este mes" }], empty: "Aquí vas a ver los comunicados del club", action: "Comunicado" },
  multimedia: { hint: "12 fotos", stats: [{ value: "12", label: "fotos" }, { value: "3", label: "videos" }], empty: "Aquí vas a ver fotos y videos", action: "Subir" },
  solicitudes: { hint: "2 por responder", badge: 2, stats: [{ value: "2", label: "por responder" }, { value: "5", label: "aprobadas" }], tabs: ["Recibidas", "Mías"], empty: "Aquí vas a ver las solicitudes", action: "Solicitud" },
  viajes: { hint: "En 3 días", stats: [{ value: "3 días", label: "próximo viaje" }, { value: "24", label: "viajeros" }], empty: "Aquí vas a ver los viajes del equipo", action: "Viaje" },
  eventos: { hint: "Próximamente", stats: [], empty: "Muy pronto", action: "Evento" },
  plantel: { hint: "61 personas", stats: [{ value: "48", label: "jugadores" }, { value: "13", label: "staff" }], tabs: ["Jugadores", "Staff"], empty: "Aquí vas a ver el plantel de tu categoría", action: "Agregar" },
  partidos: { hint: "Sáb · vs Racing", stats: [{ value: "Sáb", label: "vs Racing" }, { value: "3-1", label: "último" }], tabs: ["Próximos", "Jugados"], empty: "Aquí vas a ver los partidos", action: "Partido" },
  entrenamientos: { hint: "Hoy 7:00 am", stats: [{ value: "7:00", label: "hoy" }, { value: "5", label: "esta semana" }], empty: "Aquí vas a ver los entrenamientos", action: "Entrenamiento" },
  evaluaciones: { hint: "3 pendientes", badge: 3, stats: [{ value: "3", label: "pendientes" }], empty: "Aquí vas a ver las evaluaciones", action: "Evaluación" },
  torneo: { hint: "4º lugar", stats: [{ value: "4º", label: "posición" }, { value: "22", label: "puntos" }], empty: "Aquí vas a ver la tabla del torneo", action: "Agregar" },
  utileria: { hint: "86 artículos", stats: [{ value: "86", label: "artículos" }, { value: "4", label: "por reponer" }], empty: "Aquí vas a ver la utilería", action: "Artículo" },
  salud: { hint: "2 lesionados", badge: 2, stats: [{ value: "2", label: "lesionados" }, { value: "1", label: "cita hoy" }], tabs: ["Lesiones", "Citas"], empty: "Aquí vas a ver la salud del plantel", action: "Lesión" },
  nutricion: { hint: "3 planes", stats: [{ value: "3", label: "planes activos" }], empty: "Aquí vas a ver los planes de nutrición", action: "Plan" },
};

export const MOCK_CATEGORY = "Primer Equipo";
