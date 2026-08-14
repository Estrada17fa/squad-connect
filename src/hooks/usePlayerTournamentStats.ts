import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface PlayerTournamentStatRow {
  tournament_id: string;
  tournament_name: string;
  season_name: string | null;
  team_id: string | null;
  goals: number;
  matches_scored: number;
}

/**
 * Estadísticas AUTOMÁTICAS del jugador derivadas del goleo del torneo
 * (vista `player_tournament_stats`, siempre en sincronía con lo capturado).
 * Las filas manuales de `player_competition_stats` quedan como histórico.
 */
export function usePlayerTournamentStats(playerUserId: string | null | undefined) {
  return useQuery({
    queryKey: ["player-tournament-stats", playerUserId ?? "none"],
    enabled: !!playerUserId,
    staleTime: 30_000,
    queryFn: async (): Promise<PlayerTournamentStatRow[]> => {
      const { data, error } = await db
        .from("player_tournament_stats")
        .select("tournament_id, tournament_name, season_name, team_id, goals, matches_scored")
        .eq("player_user_id", playerUserId);
      if (error) throw error;
      return (data ?? []).sort((a: PlayerTournamentStatRow, b: PlayerTournamentStatRow) =>
        (b.season_name ?? "").localeCompare(a.season_name ?? "") || b.goals - a.goals,
      );
    },
  });
}
