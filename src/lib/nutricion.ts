/**
 * Módulo Nutrición — catálogos y cálculos.
 *
 * Fuente única del peso y la talla: el estudio antropométrico. Plantel y
 * Desarrollo LEEN el último estudio, no capturan peso.
 */

export type MealSlot = "desayuno" | "colacion_1" | "comida" | "colacion_2" | "cena";

export const MEAL_SLOT_ORDER: MealSlot[] = [
  "desayuno",
  "colacion_1",
  "comida",
  "colacion_2",
  "cena",
];

export const MEAL_SLOT_LABEL: Record<MealSlot, string> = {
  desayuno: "Desayuno",
  colacion_1: "Colación 1",
  comida: "Comida",
  colacion_2: "Colación 2",
  cena: "Cena",
};

export type FoodGroup =
  | "proteinas"
  | "cereales"
  | "verduras"
  | "frutas"
  | "grasas"
  | "lacteos"
  | "leguminosas"
  | "azucares"
  | "libres";

export const FOOD_GROUP_ORDER: FoodGroup[] = [
  "proteinas",
  "cereales",
  "verduras",
  "frutas",
  "grasas",
  "lacteos",
  "leguminosas",
  "azucares",
  "libres",
];

export const FOOD_GROUP_LABEL: Record<FoodGroup, string> = {
  proteinas: "Proteínas",
  cereales: "Cereales",
  verduras: "Verduras",
  frutas: "Frutas",
  grasas: "Grasas",
  lacteos: "Lácteos",
  leguminosas: "Leguminosas",
  azucares: "Azúcares",
  libres: "Libres",
};

/** Tipos de semana sugeridos (la nutrióloga puede escribir el suyo). */
export const WEEK_TYPE_PRESETS = [
  "Carga normal",
  "Doble jornada",
  "Semana de partido",
  "Recuperación",
  "Pretemporada",
];

/* ------------------------------------------------------------------ */
/* Antropometría ISAK                                                  */
/* ------------------------------------------------------------------ */

export interface IsakField {
  key: string;
  label: string;
  unit: "kg" | "cm" | "mm";
}

export interface IsakSection {
  key: string;
  title: string;
  fields: IsakField[];
}

export const ISAK_SECTIONS: IsakSection[] = [
  {
    key: "basicas",
    title: "Medidas básicas",
    fields: [
      { key: "body_mass_kg", label: "Masa corporal (peso)", unit: "kg" },
      { key: "height_cm", label: "Talla", unit: "cm" },
      { key: "sitting_height_cm", label: "Talla sentado", unit: "cm" },
      { key: "arm_span_cm", label: "Envergadura de brazos", unit: "cm" },
    ],
  },
  {
    key: "pliegues",
    title: "Pliegues cutáneos",
    fields: [
      { key: "skf_triceps", label: "Tríceps", unit: "mm" },
      { key: "skf_subscapular", label: "Subescapular", unit: "mm" },
      { key: "skf_biceps", label: "Bíceps", unit: "mm" },
      { key: "skf_iliac_crest", label: "Cresta ilíaca", unit: "mm" },
      { key: "skf_supraspinale", label: "Supraespinal", unit: "mm" },
      { key: "skf_abdominal", label: "Abdominal", unit: "mm" },
      { key: "skf_thigh", label: "Muslo", unit: "mm" },
      { key: "skf_calf", label: "Pierna", unit: "mm" },
    ],
  },
  {
    key: "perimetros",
    title: "Perímetros",
    fields: [
      { key: "girth_head", label: "Cabeza", unit: "cm" },
      { key: "girth_neck", label: "Cuello", unit: "cm" },
      { key: "girth_arm_relaxed", label: "Brazo relajado", unit: "cm" },
      { key: "girth_arm_flexed", label: "Brazo flexionado y contraído", unit: "cm" },
      { key: "girth_forearm", label: "Antebrazo", unit: "cm" },
      { key: "girth_wrist", label: "Muñeca", unit: "cm" },
      { key: "girth_chest", label: "Tórax", unit: "cm" },
      { key: "girth_waist", label: "Cintura", unit: "cm" },
      { key: "girth_hips", label: "Caderas", unit: "cm" },
      { key: "girth_thigh_1cm", label: "Muslo 1 cm glúteo", unit: "cm" },
      { key: "girth_thigh_mid", label: "Muslo medio", unit: "cm" },
      { key: "girth_calf", label: "Pierna", unit: "cm" },
      { key: "girth_ankle", label: "Tobillo", unit: "cm" },
    ],
  },
  {
    key: "diametros",
    title: "Diámetros",
    fields: [
      { key: "brd_biacromial", label: "Biacromial", unit: "cm" },
      { key: "brd_ap_abdominal", label: "Antero-posterior del abdomen", unit: "cm" },
      { key: "brd_biiliocristal", label: "Biiliocrestal", unit: "cm" },
      { key: "brd_transverse_chest", label: "Transverso del tórax", unit: "cm" },
      { key: "brd_ap_chest", label: "Antero-posterior del tórax", unit: "cm" },
      { key: "brd_humerus", label: "Húmero", unit: "cm" },
      { key: "brd_biestyloid", label: "Biestiloideo", unit: "cm" },
      { key: "brd_femur", label: "Fémur", unit: "cm" },
      { key: "brd_bimalleolar", label: "Bimaleolar", unit: "cm" },
    ],
  },
  {
    key: "longitudes",
    title: "Longitudes y alturas",
    fields: [
      { key: "len_acromiale_radiale", label: "Acromiale-radiale", unit: "cm" },
      { key: "len_radiale_stylion", label: "Radiale-stylion", unit: "cm" },
      { key: "len_midstylion_dactylion", label: "Stylion medio-dactylion", unit: "cm" },
      { key: "hgt_iliospinale", label: "Altura iliospinale", unit: "cm" },
      { key: "hgt_trochanterion", label: "Altura trochanterion", unit: "cm" },
      { key: "len_trochanterion_tibiale", label: "Trochanterion-tibiale laterale", unit: "cm" },
      { key: "hgt_tibiale_laterale", label: "Altura tibiale laterale", unit: "cm" },
      { key: "len_foot", label: "Pie", unit: "cm" },
      { key: "len_tibiale_mediale_sphyrion", label: "Tibiale mediale-sphyrion tibiale", unit: "cm" },
    ],
  },
];

export const ISAK_FIELD_KEYS = ISAK_SECTIONS.flatMap((s) => s.fields.map((f) => f.key));

export type IsakValues = Record<string, number | null>;

/* ------------------------------------------------------------------ */
/* Cálculos                                                            */
/* ------------------------------------------------------------------ */

function num(v: unknown): number | null {
  const n = typeof v === "number" ? v : v == null || v === "" ? NaN : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** IMC = peso / talla² (talla en metros). */
export function bmi(values: IsakValues): number | null {
  const w = num(values["body_mass_kg"]);
  const h = num(values["height_cm"]);
  if (w == null || h == null || h <= 0) return null;
  const m = h / 100;
  return w / (m * m);
}

/**
 * % de grasa corporal — fórmula de FAULKNER (4 pliegues, mm):
 * tríceps + subescapular + supraespinal + abdominal.
 * %grasa = (Σ4 × 0.153) + 5.783
 */
export function bodyFatFaulkner(values: IsakValues): number | null {
  const keys = ["skf_triceps", "skf_subscapular", "skf_supraspinale", "skf_abdominal"];
  const parts = keys.map((k) => num(values[k]));
  if (parts.some((p) => p == null)) return null;
  const sum = parts.reduce<number>((a, b) => a + (b as number), 0);
  return sum * 0.153 + 5.783;
}

export const SKINFOLD_6 = [
  "skf_triceps",
  "skf_subscapular",
  "skf_supraspinale",
  "skf_abdominal",
  "skf_thigh",
  "skf_calf",
];

export const SKINFOLD_8 = [
  ...SKINFOLD_6,
  "skf_biceps",
  "skf_iliac_crest",
];

export function skinfoldSum(values: IsakValues, keys: string[]): number | null {
  const parts = keys.map((k) => num(values[k]));
  if (parts.some((p) => p == null)) return null;
  return parts.reduce<number>((a, b) => a + (b as number), 0);
}

export interface Somatotype {
  endomorphy: number;
  mesomorphy: number;
  ectomorphy: number;
}

/** Somatotipo Heath-Carter (requiere pliegues, diámetros y perímetros clave). */
export function somatotype(values: IsakValues): Somatotype | null {
  const h = num(values["height_cm"]);
  const w = num(values["body_mass_kg"]);
  const tri = num(values["skf_triceps"]);
  const sub = num(values["skf_subscapular"]);
  const sup = num(values["skf_supraspinale"]);
  const calfSkf = num(values["skf_calf"]);
  const humerus = num(values["brd_humerus"]);
  const femur = num(values["brd_femur"]);
  const armFlexed = num(values["girth_arm_flexed"]);
  const calfGirth = num(values["girth_calf"]);
  if (
    h == null || w == null || tri == null || sub == null || sup == null ||
    calfSkf == null || humerus == null || femur == null || armFlexed == null || calfGirth == null ||
    h <= 0 || w <= 0
  ) {
    return null;
  }

  const x = ((tri + sub + sup) * 170.18) / h;
  const endomorphy = -0.7182 + 0.1451 * x - 0.00068 * x * x + 0.0000014 * x * x * x;

  const correctedArm = armFlexed - tri / 10;
  const correctedCalf = calfGirth - calfSkf / 10;
  const mesomorphy =
    0.858 * humerus + 0.601 * femur + 0.188 * correctedArm + 0.161 * correctedCalf - h * 0.131 + 4.5;

  const hwr = h / Math.cbrt(w);
  let ectomorphy: number;
  if (hwr >= 40.75) ectomorphy = 0.732 * hwr - 28.58;
  else if (hwr > 38.25) ectomorphy = 0.463 * hwr - 17.63;
  else ectomorphy = 0.1;

  return {
    endomorphy: Math.max(0.1, endomorphy),
    mesomorphy: Math.max(0.1, mesomorphy),
    ectomorphy: Math.max(0.1, ectomorphy),
  };
}

export function somatotypeLabel(s: Somatotype): string {
  const { endomorphy: en, mesomorphy: me, ectomorphy: ec } = s;
  const max = Math.max(en, me, ec);
  if (max === me) return "Mesomorfo dominante";
  if (max === en) return "Endomorfo dominante";
  return "Ectomorfo dominante";
}

export interface AnthroResults {
  bmi: number | null;
  bodyFat: number | null;
  sum6: number | null;
  sum8: number | null;
  somatotype: Somatotype | null;
}

export function anthroResults(values: IsakValues): AnthroResults {
  return {
    bmi: bmi(values),
    bodyFat: bodyFatFaulkner(values),
    sum6: skinfoldSum(values, SKINFOLD_6),
    sum8: skinfoldSum(values, SKINFOLD_8),
    somatotype: somatotype(values),
  };
}

export function fmtNumber(v: number | null | undefined, digits = 1, suffix = ""): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return `${v.toFixed(digits)}${suffix}`;
}

/* ------------------------------------------------------------------ */
/* Fechas                                                              */
/* ------------------------------------------------------------------ */

export function formatDay(date: string | null | undefined): string {
  if (!date) return "—";
  const iso = date.length <= 10 ? `${date}T12:00:00` : date;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });
}

export function formatShortDay(date: string | null | undefined): string {
  if (!date) return "—";
  const iso = date.length <= 10 ? `${date}T12:00:00` : date;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" });
}

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Lunes de la semana de una fecha dada (o de hoy). */
export function weekStartOf(date = new Date()): string {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const day = (d.getDay() + 6) % 7; // 0 = lunes
  d.setDate(d.getDate() - day);
  return toISODate(d);
}

export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function weekRangeLabel(start: string, end: string): string {
  return `${formatShortDay(start)} — ${formatShortDay(end)}`;
}

/** ¿La semana del plan contiene la fecha indicada? */
export function isCurrentWeek(start: string, end: string, ref = new Date()): boolean {
  const today = toISODate(ref);
  return start <= today && today <= end;
}

/* ------------------------------------------------------------------ */
/* Etiquetas de porciones y iconos                                     */
/* ------------------------------------------------------------------ */

/** Etiqueta corta del grupo para los chips del plan. */
export const FOOD_GROUP_SHORT: Record<FoodGroup, string> = {
  proteinas: "proteína",
  cereales: "cereal",
  verduras: "verdura",
  frutas: "fruta",
  grasas: "grasa",
  lacteos: "lácteo",
  leguminosas: "leguminosa",
  azucares: "azúcar",
  libres: "libre",
};

/** Formatea un número de porciones sin decimales inútiles (2, 1.5). */
export function portionsNumber(n: number): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0";
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

/** "2 porciones de proteína" / "1 porción de fruta". */
export function portionsLabel(n: number, group: FoodGroup): string {
  const v = Number(n);
  const word = v === 1 ? "porción" : "porciones";
  return `${portionsNumber(v)} ${word} de ${FOOD_GROUP_SHORT[group]}`;
}

/** Chip compacto: "2 porc. proteína". */
export function portionsChipLabel(n: number, group: FoodGroup): string {
  return `${portionsNumber(n)} porc. ${FOOD_GROUP_SHORT[group]}`;
}

export const PORTION_MIN = 0.5;
export const PORTION_MAX = 10;
export const PORTION_STEP = 0.5;

export function clampPortions(n: number): number {
  if (!Number.isFinite(n)) return PORTION_MIN;
  return Math.min(PORTION_MAX, Math.max(PORTION_MIN, Math.round(n * 2) / 2));
}
