/** Dirección pública principal de la app (dominio publicado). */
export const APP_URL = "https://squadlcu.app";

/**
 * Enlace que se comparte con miembros nuevos. Si la app ya corre en un
 * dominio publicado se usa ese mismo; en vista previa o local, la dirección
 * pública principal.
 */
export function getShareAppUrl(): string {
  if (typeof window === "undefined") return APP_URL;
  const { origin, hostname } = window.location;
  const isPreview = hostname === "localhost" || hostname.startsWith("id-preview--") || hostname.includes("lovableproject");
  return isPreview ? APP_URL : origin;
}
