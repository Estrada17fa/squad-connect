import type { StatusVariant } from "@/components/squad/StatusBadge";
import type { AvailabilityStatus } from "@/hooks/usePlayers";

export const AVAILABILITY_META: Record<AvailabilityStatus, { label: string; variant: StatusVariant }> = {
  apto: { label: "Apto", variant: "info" },
  lesionado: { label: "Lesionado", variant: "rejected" },
  en_duda: { label: "En duda", variant: "pending" },
};

export type PositionGroup = "portero" | "defensa" | "medio" | "delantero" | "otro";

export const POSITION_GROUP_ORDER: PositionGroup[] = [
  "portero",
  "defensa",
  "medio",
  "delantero",
  "otro",
];

export const POSITION_GROUP_LABEL: Record<PositionGroup, string> = {
  portero: "Porteros",
  defensa: "Defensas",
  medio: "Mediocampistas",
  delantero: "Delanteros",
  otro: "Sin posición",
};

/**
 * La posición se guarda como texto libre, así que agrupamos por palabras clave
 * del fútbol (español e inglés) para que la vista siga siendo escaneable.
 */
export function positionGroup(position: string | null | undefined): PositionGroup {
  const p = (position ?? "").toLowerCase();
  if (!p.trim()) return "otro";
  if (/(portero|arquero|guardameta|golero|goalkeeper|\bgk\b|\bpo\b)/.test(p)) return "portero";
  if (/(defens|central|lateral|zaguero|líbero|libero|carrilero|back|\bdf\b)/.test(p)) return "defensa";
  if (/(medio|mediocampi|volante|pivote|contenci|interior|enganche|midfield|\bmc\b|\bmv\b)/.test(p))
    return "medio";
  if (/(delanter|extremo|atacante|punta|ariete|centro delantero|forward|striker|winger|\bdc\b)/.test(p))
    return "delantero";
  return "otro";
}

export const PREFERRED_FOOT_LABEL: Record<string, string> = {
  derecho: "Pie derecho",
  izquierdo: "Pie izquierdo",
  ambidiestro: "Ambidiestro",
};
