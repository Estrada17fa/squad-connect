// @refresh reset
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  const { profile, accessibleModules, teamOptions } = useApp();
  const clubId = profile?.club_id ?? null;
  const enabled = accessibleModules.includes("torneo");
  const { canReadTeam } = useTeamAccess("torneo");

  const { data: tournaments } = useTournaments(enabled ? clubId : null);

  const candidates = React.useMemo(
    () => (tournaments ?? []).filter((t) => t.status === "en_curso" && canReadTeam(t.team_id)),
    [tournaments, canReadTeam],
  );

  // Qué torneos en curso tienen marcado un equipo "nuestro": sin eso no hay
  // posición que mostrar y el bloque de Inicio quedaría vacío.
  const candidateIds = candidates.map((t) => t.id);
  const { data: withOurTeam } = useQuery({
    queryKey: ["tournaments", "with-our-team", candidateIds.join(",")] as const,
    enabled: candidateIds.length > 0,
    staleTime: 60_000,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("tournament_teams")
        .select("tournament_id")
        .in("tournament_id", candidateIds)
        .eq("is_our_team", true);
      if (error) throw error;
      return (data ?? []).map((r) => r.tournament_id as string);
    },
  });

  const tournament = React.useMemo(() => {
    if (!candidates.length) return null;
    const ok = new Set(withOurTeam ?? []);
    const myTeams = new Set(teamOptions.map((t) => t.id).filter(Boolean) as string[]);
    // 1) torneo de mi equipo que tenga equipo nuestro, 2) cualquiera con equipo
    // nuestro, 3) el primero como último recurso.
    return (
      candidates.find((t) => ok.has(t.id) && t.team_id && myTeams.has(t.team_id)) ??
      candidates.find((t) => ok.has(t.id)) ??
      candidates[0] ??
      null
    );
  }, [candidates, withOurTeam, teamOptions]);

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
