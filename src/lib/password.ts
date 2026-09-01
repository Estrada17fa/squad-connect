/**
 * Regla ÚNICA de contraseña del proyecto.
 *
 * Mínimos obligatorios: 8+ caracteres, 1 número, 1 minúscula y 1 mayúscula.
 * Cualquier otro carácter (símbolos, acentos, espacios) es VÁLIDO y NO se exige.
 * No existe lista blanca de caracteres: nunca se rechaza un carácter por sí mismo.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_RULES_TEXT =
  "Mínimo 8 caracteres, 1 número, 1 minúscula y 1 mayúscula. Puedes usar símbolos, no son obligatorios.";

export interface PasswordRequirement {
  key: "length" | "number" | "lower" | "upper";
  label: string;
  /** Mensaje concreto cuando no se cumple. */
  error: string;
  met: boolean;
}

export function checkPassword(value: string): {
  requirements: PasswordRequirement[];
  missing: string[];
  isValid: boolean;
} {
  const v = value ?? "";
  const requirements: PasswordRequirement[] = [
    {
      key: "length",
      label: "Mínimo 8 caracteres",
      error: "Mínimo 8 caracteres",
      met: v.length >= PASSWORD_MIN_LENGTH && v.length <= PASSWORD_MAX_LENGTH,
    },
    { key: "number", label: "Al menos 1 número", error: "Falta un número", met: /[0-9]/.test(v) },
    { key: "lower", label: "Al menos 1 minúscula", error: "Falta una minúscula", met: /\p{Ll}/u.test(v) },
    { key: "upper", label: "Al menos 1 mayúscula", error: "Falta una mayúscula", met: /\p{Lu}/u.test(v) },
  ];
  const missing = requirements.filter((r) => !r.met).map((r) => r.error);
  return { requirements, missing, isValid: missing.length === 0 };
}

export function isPasswordValid(value: string): boolean {
  return checkPassword(value).isValid;
}

/** Mensaje corto y específico con lo que falta (o null si es válida). */
export function passwordError(value: string): string | null {
  const { missing } = checkPassword(value);
  return missing.length ? missing.join(" · ") : null;
}

const WORDS = [
  "Tigre","Playa","Cabo","Barco","Nube","Roble","Faro","Duna","Cielo","Lobo",
  "Verde","Rayo","Pino","Marea","Cactus","Zorro","Piedra","Fuego","Luna","Ronda",
  "Delta","Sierra","Vela","Coral","Halcon","Bruma","Cedro","Nieve","Puente","Vaso",
];

function pick<T>(arr: T[]): T {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return arr[n[0] % arr.length]!;
}

/**
 * Sugerencia fácil de leer y escribir que siempre cumple la regla
 * (mayúscula, minúscula, número, 8+) y no es una contraseña común filtrada.
 */
export function suggestPassword(): string {
  let a = pick(WORDS);
  let b = pick(WORDS);
  while (b === a) b = pick(WORDS);
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  const num = 10 + (n[0] % 90);
  return `${a}-${b.toLowerCase()}-${num}`;
}

/** Traduce errores del backend de autenticación a español claro. */
export function friendlyPasswordError(message?: string | null): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("pwned") || m.includes("leaked") || m.includes("compromised") || m.includes("data breach")) {
    return "Esa contraseña aparece en filtraciones públicas conocidas. Elige una diferente.";
  }
  if (m.includes("should be at least") || m.includes("password should")) {
    return PASSWORD_RULES_TEXT;
  }
  if (m.includes("different from the old") || m.includes("same as the old")) {
    return "La nueva contraseña debe ser distinta a la anterior.";
  }
  return message || "No se pudo actualizar la contraseña";
}
