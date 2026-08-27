/**
 * Orden explícito de las categorías/equipos del club.
 * La categoría principal va primero, luego el orden manual (display_order) y
 * el nombre como desempate. Se usa en TODA la app para que los selectores,
 * chips y listas muestren siempre la misma secuencia.
 */
export interface OrderableTeam {
  name: string;
  displayOrder?: number | null;
  isPrimary?: boolean | null;
}

export function compareTeams(a: OrderableTeam, b: OrderableTeam): number {
  if (!!a.isPrimary !== !!b.isPrimary) return a.isPrimary ? -1 : 1;
  const ao = a.displayOrder ?? 0;
  const bo = b.displayOrder ?? 0;
  if (ao !== bo) return ao - bo;
  return (a.name ?? "").localeCompare(b.name ?? "", "es");
}

export function sortTeams<T extends OrderableTeam>(teams: T[]): T[] {
  return [...teams].sort(compareTeams);
}

/** Aplica el orden explícito a una consulta de la tabla `teams`. */
export function orderTeamsQuery<T extends { order: (col: string, opts?: any) => T }>(q: T): T {
  return q.order("is_primary", { ascending: false }).order("display_order").order("name");
}
