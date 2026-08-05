import {
  Package,
  Shirt,
  Dumbbell,
  HeartPulse,
  Wrench,
  Trophy,
  Boxes,
  type LucideIcon,
} from "lucide-react";

/** Ícono de respaldo por categoría cuando el artículo no tiene foto. */
export function categoryIcon(category: string | null | undefined): LucideIcon {
  const c = (category ?? "").toLowerCase();
  if (/uniforme|ropa|indument|jersey|playera/.test(c)) return Shirt;
  if (/gym|fuerza|pesas|acondicion/.test(c)) return Dumbbell;
  if (/medic|salud|fisio|botiqu/.test(c)) return HeartPulse;
  if (/util|herram|manten/.test(c)) return Wrench;
  if (/entren|balon|cancha|deport/.test(c)) return Trophy;
  if (/general|varios|otro/.test(c)) return Boxes;
  return Package;
}

export const SIN_CATEGORIA = "Sin categoría";

/** Formatea una fecha ISO como "12 mar 2026". */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
