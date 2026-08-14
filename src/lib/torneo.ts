/**
 * Módulo Torneo — reglas de competencia (Parte 1).
 *
 * Aquí vive el vocabulario del módulo: tipos de torneo, estados, criterios de
 * desempate y los presets del sistema de puntos. El cálculo de la tabla llega
 * en la Parte 2; estas utilidades ya dejan la configuración normalizada.
 */

export type TournamentStatus = "en_curso" | "finalizado";
export type TournamentType = "liga" | "copa" | "otro";

export const TOURNAMENT_STATUS_LABEL: Record<TournamentStatus, string> = {
  en_curso: "En curso",
  finalizado: "Finalizado",
};

export const TOURNAMENT_TYPE_LABEL: Record<TournamentType, string> = {
  liga: "Liga",
  copa: "Copa",
  otro: "Otro",
};

/* ------------------------------------------------------------------ */
/* Criterios de desempate                                              */
/* ------------------------------------------------------------------ */

export type TiebreakerKey =
  | "puntos"
  | "diferencia_goles"
  | "goles_favor"
  | "goles_contra"
  | "enfrentamientos_directos"
  | "partidos_ganados"
  | "goles_visita"
  | "sorteo";

export const TIEBREAKER_LABEL: Record<TiebreakerKey, string> = {
  puntos: "Puntos",
  diferencia_goles: "Diferencia de goles",
  goles_favor: "Goles a favor",
  goles_contra: "Goles en contra (menos)",
  enfrentamientos_directos: "Enfrentamientos directos",
  partidos_ganados: "Partidos ganados",
  goles_visita: "Goles de visitante",
  sorteo: "Sorteo",
};

export const ALL_TIEBREAKERS: TiebreakerKey[] = [
  "diferencia_goles",
  "goles_favor",
  "goles_contra",
  "enfrentamientos_directos",
  "partidos_ganados",
  "goles_visita",
  "sorteo",
];

/** Normaliza el JSONB de la base a una lista de criterios válidos y sin repetir. */
export function parseTiebreakers(value: unknown): TiebreakerKey[] {
  const raw = Array.isArray(value) ? value : [];
  const out: TiebreakerKey[] = [];
  for (const item of raw) {
    const key = String(item) as TiebreakerKey;
    if (TIEBREAKER_LABEL[key] && !out.includes(key)) out.push(key);
  }
  return out.length ? out : DEFAULT_TIEBREAKERS;
}

export const DEFAULT_TIEBREAKERS: TiebreakerKey[] = [
  "diferencia_goles",
  "goles_favor",
  "enfrentamientos_directos",
];

/* ------------------------------------------------------------------ */
/* Sistema de puntos                                                   */
/* ------------------------------------------------------------------ */

export interface PointsConfig {
  points_win: number;
  points_draw: number;
  points_loss: number;
  away_bonus_enabled: boolean;
  away_bonus_min_diff: number;
  away_bonus_points: number;
  shootout_enabled: boolean;
  shootout_min_goals: number;
  shootout_winner_points: number;
  tiebreakers: TiebreakerKey[];
}

export interface PointsPreset {
  key: string;
  label: string;
  description: string;
  config: PointsConfig;
}

export const POINTS_PRESETS: PointsPreset[] = [
  {
    key: "estandar",
    label: "Estándar",
    description: "3 puntos por victoria, 1 por empate. Sin bonus ni penales.",
    config: {
      points_win: 3,
      points_draw: 1,
      points_loss: 0,
      away_bonus_enabled: false,
      away_bonus_min_diff: 2,
      away_bonus_points: 1,
      shootout_enabled: false,
      shootout_min_goals: 2,
      shootout_winner_points: 1,
      tiebreakers: DEFAULT_TIEBREAKERS,
    },
  },
  {
    key: "premier_mx",
    label: "Liga Premier México",
    description:
      "3 / 1 / 0, punto extra al ganar de visita por 2 o más goles y penales en empates de 2 goles o más.",
    config: {
      points_win: 3,
      points_draw: 1,
      points_loss: 0,
      away_bonus_enabled: true,
      away_bonus_min_diff: 2,
      away_bonus_points: 1,
      shootout_enabled: true,
      shootout_min_goals: 2,
      shootout_winner_points: 1,
      tiebreakers: [
        "diferencia_goles",
        "goles_favor",
        "enfrentamientos_directos",
        "partidos_ganados",
      ],
    },
  },
];

export const DEFAULT_POINTS: PointsConfig = POINTS_PRESETS[0].config;

/** Resumen legible del sistema de puntos, para la ficha del torneo. */
export function pointsSummary(c: PointsConfig): string[] {
  const out = [`${c.points_win} por victoria · ${c.points_draw} por empate · ${c.points_loss} por derrota`];
  if (c.away_bonus_enabled) {
    out.push(
      `+${c.away_bonus_points} al ganar de visita por ${c.away_bonus_min_diff} o más goles`,
    );
  }
  if (c.shootout_enabled) {
    out.push(
      `Penales en empates de ${c.shootout_min_goals} o más goles: +${c.shootout_winner_points} al ganador`,
    );
  }
  return out;
}
