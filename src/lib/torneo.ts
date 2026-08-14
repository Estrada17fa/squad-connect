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

/* ------------------------------------------------------------------ */
/* Parte 2 — cálculo de resultados y tabla de posiciones               */
/* ------------------------------------------------------------------ */

export type MatchStatus = "programado" | "jugado" | "suspendido";

export const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  programado: "Programado",
  jugado: "Jugado",
  suspendido: "Suspendido",
};

export interface MatchLike {
  home_team_id: string;
  away_team_id: string;
  home_goals: number | null;
  away_goals: number | null;
  status: MatchStatus | string;
  shootout_winner_team_id?: string | null;
}

/** ¿El marcador dispara la tanda de penales según la configuración? */
export function needsShootout(c: PointsConfig, home: number | null, away: number | null): boolean {
  if (!c.shootout_enabled) return false;
  if (home == null || away == null) return false;
  if (home !== away) return false;
  return home >= c.shootout_min_goals;
}

export interface SidePoints {
  points: number;
  /** Desglose legible: ["3 por victoria", "1 por bonus de visita"] */
  parts: string[];
}

export interface MatchPoints {
  home: SidePoints;
  away: SidePoints;
}

/** Puntos de un partido jugado, con el desglose por equipo. */
export function matchPoints(c: PointsConfig, m: MatchLike): MatchPoints | null {
  if (m.status !== "jugado" || m.home_goals == null || m.away_goals == null) return null;
  const home: SidePoints = { points: 0, parts: [] };
  const away: SidePoints = { points: 0, parts: [] };

  const add = (side: SidePoints, pts: number, label: string) => {
    side.points += pts;
    if (pts !== 0) side.parts.push(`${pts > 0 ? pts : pts} por ${label}`);
  };

  if (m.home_goals > m.away_goals) {
    add(home, c.points_win, "victoria");
    add(away, c.points_loss, "derrota");
  } else if (m.away_goals > m.home_goals) {
    add(away, c.points_win, "victoria");
    add(home, c.points_loss, "derrota");
    if (c.away_bonus_enabled && m.away_goals - m.home_goals >= c.away_bonus_min_diff) {
      add(away, c.away_bonus_points, "bonus de visita");
    }
  } else {
    add(home, c.points_draw, "empate");
    add(away, c.points_draw, "empate");
    if (needsShootout(c, m.home_goals, m.away_goals) && m.shootout_winner_team_id) {
      if (m.shootout_winner_team_id === m.home_team_id) add(home, c.shootout_winner_points, "penales");
      else if (m.shootout_winner_team_id === m.away_team_id) add(away, c.shootout_winner_points, "penales");
    }
  }
  return { home, away };
}

const plural = (n: number) => `${n} ${Math.abs(n) === 1 ? "pt" : "pts"}`;

/** Texto de una línea con el desglose del partido. */
export function matchPointsSummary(c: PointsConfig, m: MatchLike, homeName: string, awayName: string): string | null {
  const mp = matchPoints(c, m);
  if (!mp) return null;
  const side = (name: string, s: SidePoints) =>
    `${name} ${plural(s.points)}${s.parts.length > 1 ? ` (${s.parts.join(" + ")})` : ""}`;
  return `${side(homeName, mp.home)} · ${side(awayName, mp.away)}`;
}

export interface StandingTeam {
  id: string;
  name: string;
  is_our_team?: boolean | null;
  crest_path?: string | null;
}

export interface AdjustmentLike {
  team_id: string;
  points: number;
  reason?: string | null;
}

export interface StandingRow {
  team_id: string;
  name: string;
  is_our_team: boolean;
  crest_path: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  base_points: number;
  adjustment: number;
  adjustment_reasons: string[];
  points: number;
  away_goals: number;
  position: number;
}

function emptyRow(t: StandingTeam): StandingRow {
  return {
    team_id: t.id,
    name: t.name,
    is_our_team: !!t.is_our_team,
    crest_path: t.crest_path ?? null,
    played: 0, won: 0, drawn: 0, lost: 0,
    goals_for: 0, goals_against: 0, goal_diff: 0,
    base_points: 0, adjustment: 0, adjustment_reasons: [],
    points: 0, away_goals: 0, position: 0,
  };
}

/** Desempate por enfrentamientos directos entre un grupo de equipos empatados. */
function headToHead(c: PointsConfig, matches: MatchLike[], ids: string[]): Record<string, number> {
  const out: Record<string, number> = {};
  ids.forEach((id) => (out[id] = 0));
  for (const m of matches) {
    if (!ids.includes(m.home_team_id) || !ids.includes(m.away_team_id)) continue;
    const mp = matchPoints(c, m);
    if (!mp) continue;
    out[m.home_team_id] += mp.home.points;
    out[m.away_team_id] += mp.away.points;
  }
  return out;
}

/** Tabla de posiciones calculada al vuelo, ordenada por los criterios del torneo. */
export function buildStandings(
  c: PointsConfig,
  teams: StandingTeam[],
  matches: MatchLike[],
  adjustments: AdjustmentLike[] = [],
): StandingRow[] {
  const rows = new Map<string, StandingRow>();
  teams.forEach((t) => rows.set(t.id, emptyRow(t)));

  for (const m of matches) {
    const mp = matchPoints(c, m);
    if (!mp) continue;
    const h = rows.get(m.home_team_id);
    const a = rows.get(m.away_team_id);
    const hg = m.home_goals as number;
    const ag = m.away_goals as number;
    if (h) {
      h.played++; h.goals_for += hg; h.goals_against += ag; h.base_points += mp.home.points;
      if (hg > ag) h.won++; else if (hg === ag) h.drawn++; else h.lost++;
    }
    if (a) {
      a.played++; a.goals_for += ag; a.goals_against += hg; a.base_points += mp.away.points;
      a.away_goals += ag;
      if (ag > hg) a.won++; else if (ag === hg) a.drawn++; else a.lost++;
    }
  }

  for (const adj of adjustments) {
    const r = rows.get(adj.team_id);
    if (!r) continue;
    r.adjustment += adj.points;
    if (adj.reason) r.adjustment_reasons.push(adj.reason);
  }

  const list = [...rows.values()];
  list.forEach((r) => {
    r.goal_diff = r.goals_for - r.goals_against;
    r.points = r.base_points + r.adjustment;
  });

  const order = c.tiebreakers ?? DEFAULT_TIEBREAKERS;
  const value = (r: StandingRow, key: TiebreakerKey): number => {
    switch (key) {
      case "puntos": return r.points;
      case "diferencia_goles": return r.goal_diff;
      case "goles_favor": return r.goals_for;
      case "goles_contra": return -r.goals_against;
      case "partidos_ganados": return r.won;
      case "goles_visita": return r.away_goals;
      default: return 0;
    }
  };

  list.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    for (const key of order) {
      if (key === "puntos") continue;
      if (key === "sorteo") continue;
      if (key === "enfrentamientos_directos") {
        const tied = list.filter((r) => r.points === a.points).map((r) => r.team_id);
        if (tied.length > 1) {
          const h2h = headToHead(c, matches, tied);
          const d = (h2h[b.team_id] ?? 0) - (h2h[a.team_id] ?? 0);
          if (d !== 0) return d;
        }
        continue;
      }
      const d = value(b, key) - value(a, key);
      if (d !== 0) return d;
    }
    return a.name.localeCompare(b.name, "es");
  });

  list.forEach((r, i) => (r.position = i + 1));
  return list;
}
