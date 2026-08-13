import type { StatusVariant } from "@/components/squad/StatusBadge";
import type { AssignmentStatus, GoalStatus } from "@/hooks/useDevelopment";

/**
 * Metadatos del módulo Desarrollo (espejo de src/lib/salud.ts).
 * Etiquetas, variantes de badge y catálogos configurables.
 */

export const GOAL_STATUS_ORDER: GoalStatus[] = ["pendiente", "en_progreso", "cumplido", "no_cumplido"];

export const GOAL_STATUS_VARIANT: Record<GoalStatus, StatusVariant> = {
  pendiente: "pending",
  en_progreso: "info",
  cumplido: "approved",
  no_cumplido: "rejected",
};

export const ASSIGNMENT_STATUS_VARIANT: Record<AssignmentStatus, StatusVariant> = {
  asignada: "pending",
  en_progreso: "info",
  completada: "approved",
};

/** Atributos sugeridos para el boletín deportivo (editables en el formulario). */
export const ASSESSMENT_ATTRIBUTES = ["Técnica", "Físico", "Táctica", "Mental/Actitud"];

/** Mediciones físicas de uso común; el club puede escribir otra. */
export const MEASUREMENT_PRESETS: { metric: string; unit: string }[] = [
  { metric: "Peso", unit: "kg" },
  { metric: "Estatura", unit: "cm" },
  { metric: "% grasa corporal", unit: "%" },
  { metric: "Masa muscular", unit: "kg" },
  { metric: "Velocidad 30 m", unit: "s" },
  { metric: "Salto vertical", unit: "cm" },
];

/** Nivel general (promedio de la última evaluación) en una escala legible. */
export function levelLabel(avg: number | null): { label: string; variant: StatusVariant } {
  if (avg == null) return { label: "Sin evaluar", variant: "neutral" };
  if (avg >= 8.5) return { label: "Destacado", variant: "approved" };
  if (avg >= 7) return { label: "Sólido", variant: "info" };
  if (avg >= 5) return { label: "En desarrollo", variant: "pending" };
  return { label: "Necesita apoyo", variant: "rejected" };
}
