import { PLAYOFF_ROUND_LABEL, type TournamentStatus, type TournamentType, type TournamentFormat } from "@/lib/torneo";

/** Estado que se muestra: "Próximo" se calcula (en curso sin partidos jugados). */
export type DisplayStatus = "proximo" | "en_curso" | "finalizado";

export const DISPLAY_STATUS_LABEL: Record<DisplayStatus, string> = {
  proximo: "Próximo",
  en_curso: "En curso",
  finalizado: "Finalizado",
};

export function displayStatus(status: TournamentStatus, playedMatches: number): DisplayStatus {
  if (status === "finalizado") return "finalizado";
  return playedMatches > 0 ? "en_curso" : "proximo";
}

/** En la nueva pantalla "otro" se muestra como Amistoso. */
export const ADMIN_TYPE_LABEL: Record<TournamentType, string> = { liga: "Liga", copa: "Copa", otro: "Amistoso" };

const ROUND_FROM: Record<number, string> = { 16: "octavos", 8: "cuartos", 4: "semifinales", 2: "la final" };

export interface FormatLike {
  format: TournamentFormat;
  groups_count: number;
  has_playoffs: boolean;
  playoff_start_round: number;
  playoff_two_legs: boolean;
}

/** Frase de resumen: "Liga a una vuelta, luego liguilla desde cuartos a ida y vuelta". */
export function formatSentence(f: FormatLike): string {
  const base = f.format === "grupos" ? `Fase de ${f.groups_count} grupos` : "Todos contra todos";
  if (!f.has_playoffs) return `${base}, sin liguilla`;
  const from = ROUND_FROM[f.playoff_start_round] ?? (PLAYOFF_ROUND_LABEL[f.playoff_start_round] ?? "").toLowerCase();
  return `${base}, luego liguilla desde ${from} ${f.playoff_two_legs ? "a ida y vuelta" : "a partido único"}`;
}

/** Línea corta para la tarjeta: "18 equipos · Liga + Liguilla". */
export function summaryLine(type: TournamentType, teams: number, hasPlayoffs: boolean): string {
  const t = ADMIN_TYPE_LABEL[type] + (hasPlayoffs ? " + Liguilla" : "");
  return `${teams} ${teams === 1 ? "equipo" : "equipos"} · ${t}`;
}

/** "Pegar lista": un nombre por línea, sin vacíos ni repetidos. */
export function parsePastedTeams(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const name = raw.replace(/^\s*(\d+[.)-]|[-•*])\s*/, "").trim();
    const k = name.toLowerCase();
    if (name && !seen.has(k)) { seen.add(k); out.push(name); }
  }
  return out;
}
