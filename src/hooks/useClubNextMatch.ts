import * as React from "react";
import { useApp } from "@/components/squad/app-context";
import { useTeamAccess } from "@/hooks/useTeamAccess";
import {
  useTournaments,
  useTournamentTeams,
  type TournamentRow,
  type TournamentTeamRow,
} from "@/hooks/useTournaments";
import {
  useTournamentMatches,
  useTournamentAdjustments,
  type MatchRow,
} from "@/hooks/useTournamentMatches";
import { buildStandings, groupLabels, type StandingRow } from "@/lib/torneo";

/**
 * Resumen de torneo para la pantalla de Inicio: el torneo en curso más
 * reciente que la persona puede ver, su próximo partido y nuestra posición.
 *
 * No añade permisos: `useTournaments` ya llega filtrado por RLS y aquí solo se
 * respeta `canReadTeam` del módulo 'torneo'. Si no hay acceso, todo es null.
 */
export interface ClubTournamentSummary {
  tournament: TournamentRow | null;
  teams: TournamentTeamRow[];
  ourTeam: TournamentTeamRow | null;
  nextMatch: MatchRow | null;
  standing: StandingRow | null;
  groupLabel: string | null;
}

export function useClubTournamentSummary(): ClubTournamentSummary {
  const { profile, accessibleModules } = useApp();
  const clubId = profile?.club_id ?? null;
  const enabled = accessibleModules.includes("torneo");
  const { canReadTeam } = useTeamAccess("torneo");

  const { data: tournaments } = useTournaments(enabled ? clubId : null);

  const tournament = React.useMemo(() => {
    const list = (tournaments ?? []).filter(
      (t) => t.status === "en_curso" && canReadTeam(t.team_id),
    );
    return list[0] ?? null;
  }, [tournaments, canReadTeam]);

  const { data: teamsData } = useTournamentTeams(tournament?.id ?? null);
  const { data: matchesData } = useTournamentMatches(tournament?.id ?? null);
  const { data: adjustmentsData } = useTournamentAdjustments(tournament?.id ?? null);

  const teams = teamsData ?? [];
  const matches = matchesData ?? [];
  const ourTeam = teams.find((t) => t.is_our_team) ?? null;

  const nextMatch = React.useMemo(() => {
    if (!ourTeam) return null;
    const now = Date.now();
    return (
      matches
        .filter(
          (m) =>
            m.status !== "jugado" &&
            m.kickoff_at != null &&
            new Date(m.kickoff_at).getTime() >= now &&
            (m.home_team_id === ourTeam.id || m.away_team_id === ourTeam.id),
        )
        .sort(
          (a, b) =>
            new Date(a.kickoff_at as string).getTime() -
            new Date(b.kickoff_at as string).getTime(),
        )[0] ?? null
    );
  }, [matches, ourTeam]);

  const { standing, groupLabel } = React.useMemo(() => {
    if (!tournament || !ourTeam || !teams.length) {
      return { standing: null, groupLabel: null };
    }
    const groups = tournament.format === "grupos" ? groupLabels(tournament.groups_count) : [];
    const ourGroup = ourTeam.group_label ?? null;
    const scoped = groups.length
      ? teams.filter((t) => (t.group_label ?? null) === ourGroup)
      : teams;
    const ids = new Set(scoped.map((t) => t.id));
    const rows = buildStandings(
      tournament,
      scoped.map((t) => ({
        id: t.id,
        name: t.name,
        is_our_team: t.is_our_team,
        crest_path: t.crest_path,
      })),
      matches
        .filter((m) => !m.tie_id && ids.has(m.home_team_id ?? "") && ids.has(m.away_team_id ?? ""))
        .map((m) => ({
          home_team_id: m.home_team_id ?? "",
          away_team_id: m.away_team_id ?? "",
          home_goals: m.home_goals,
          away_goals: m.away_goals,
          status: m.status,
          shootout_winner_team_id: m.shootout_winner_team_id,
        })),
      (adjustmentsData ?? []).map((a) => ({ team_id: a.team_id, points: a.points })),
    );
    return {
      standing: rows.find((r) => r.is_our_team) ?? null,
      groupLabel: groups.length ? ourGroup : null,
    };
  }, [tournament, teams, matches, adjustmentsData, ourTeam]);

  return { tournament, teams, ourTeam, nextMatch, standing, groupLabel };
}
