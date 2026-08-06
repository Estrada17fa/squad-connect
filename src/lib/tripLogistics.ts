/** Tipos y etiquetas compartidas por los bloques de logística del viaje. */

export type TripLeg = "ida" | "regreso";
export type TripTransportType = "bus" | "van" | "taxi" | "privado" | "otro";
export type TripMealType = "desayuno" | "comida" | "cena" | "snack";

export const LEG_LABEL: Record<TripLeg, string> = {
  ida: "Ida",
  regreso: "Regreso",
};

export const LEG_ORDER: TripLeg[] = ["ida", "regreso"];

export const TRANSPORT_TYPE_LABEL: Record<TripTransportType, string> = {
  bus: "Autobús",
  van: "Van",
  taxi: "Taxi",
  privado: "Privado",
  otro: "Otro",
};

export const TRANSPORT_TYPE_ORDER: TripTransportType[] = ["bus", "van", "taxi", "privado", "otro"];

export const MEAL_TYPE_LABEL: Record<TripMealType, string> = {
  desayuno: "Desayuno",
  comida: "Comida",
  cena: "Cena",
  snack: "Snack",
};

export const MEAL_TYPE_ORDER: TripMealType[] = ["desayuno", "comida", "cena", "snack"];

/** Perfil mínimo usado en pasajeros, ocupantes y responsables. */
export interface MiniProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export const MINI_PROFILE_SELECT = "id, full_name, email, avatar_url";

export function personLabel(p: MiniProfile | null | undefined) {
  return p?.full_name ?? p?.email ?? "Miembro";
}

export function personInitials(p: MiniProfile | null | undefined) {
  const src = p?.full_name ?? p?.email ?? "?";
  return src
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Bucket privado donde viven los pases de abordar. */
export const TRIP_DOCS_BUCKET = "trip-documents";
