/**
 * Esquemas de parámetros de URL compartidos entre `/m/<módulo>` y
 * `/coordinacion/<área>/<módulo>`, para que ambas rutas validen igual.
 */
export const openSearch = (search: Record<string, unknown>) => ({
  open: typeof search.open === "string" ? search.open : undefined,
});

export const coordInternaSearch = (search: Record<string, unknown>) => ({
  open: typeof search.open === "string" ? search.open : undefined,
  kind: search.kind === "junta" ? ("junta" as const) : search.kind === "tarea" ? ("tarea" as const) : undefined,
});

/** Props que reciben las pantallas que leen parámetros de la URL. */
export interface PageSearchProps<S = { open?: string }> {
  search?: Partial<S>;
  /** Limpia los parámetros (p. ej. tras abrir el elemento indicado). */
  onClearSearch?: () => void;
}
