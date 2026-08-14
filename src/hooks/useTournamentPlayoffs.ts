import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MatchRow } from "@/hooks/useTournamentMatches";

/**
 * Fase final del torneo (llaves). Las llaves las arma el editor a mano y el
 * ganador se propaga solo a la ronda siguiente. RLS resuelve la visibilidad.
 */

const db = supabase as any;

export interface PlayoffTieRow {
  id: string;
  tournament_id: string;
  club_id: string;
  /** Equipos que participan en esa ronda: 16, 8, 4 o 2. */
  round_size: number;
  slot: number;
  home_team_id: string | null;
  away_team_id: string | null;
  winner_team_id: string | null;
  two_legs: boolean;
  notes: string | null;
}

export function useTournamentTies(tournamentId: string | null | undefined) {
  const qc = useQueryClient();
  React.useEffect(() => {
    if (!tournamentId) return;
    const suffix = Math.random().toString(36).slice(2);
    const ch = supabase
      .channel(`torneo-ties-${tournamentId}-${suffix}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_playoff_ties" }, () =>
        qc.invalidateQueries({ queryKey: ["tournament-ties", tournamentId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [tournamentId, qc]);

  return useQuery({
    queryKey: ["tournament-ties", tournamentId ?? "none"],
    enabled: !!tournamentId,
    queryFn: async (): Promise<PlayoffTieRow[]> => {
      const { data, error } = await db
        .from("tournament_playoff_ties")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("round_size", { ascending: false })
        .order("slot", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export interface TieLegInput {
  id?: string;
  leg: number;
  home_team_id: string | null;
  away_team_id: string | null;
  kickoff_at: string | null;
  venue: string | null;
  home_goals: number | null;
  away_goals: number | null;
}

export interface SaveTieInput {
  id?: string;
  tournament_id: string;
  club_id: string;
  round_size: number;
  slot: number;
  home_team_id: string | null;
  away_team_id: string | null;
  winner_team_id: string | null;
  two_legs: boolean;
  notes: string | null;
  legs: TieLegInput[];
  /** Partidos que ya existían en la llave (para borrar los que sobran). */
  existingLegIds: string[];
  created_by: string;
}

/** Guarda la llave, sus partidos y propaga el ganador a la ronda siguiente. */
export function useSaveTie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveTieInput) => {
      const { legs, existingLegIds, created_by, ...tie } = input;

      const { data: saved, error } = await db
        .from("tournament_playoff_ties")
        .upsert(tie, { onConflict: "tournament_id,round_size,slot" })
        .select("*")
        .single();
      if (error) throw error;
      const tieId = saved.id as string;

      const keep: string[] = [];
      for (const leg of legs) {
        const payload = {
          tournament_id: tie.tournament_id,
          club_id: tie.club_id,
          tie_id: tieId,
          leg: leg.leg,
          matchday: null,
          home_team_id: leg.home_team_id,
          away_team_id: leg.away_team_id,
          kickoff_at: leg.kickoff_at,
          venue: leg.venue,
          home_goals: leg.home_goals,
          away_goals: leg.away_goals,
          status:
            leg.home_goals != null && leg.away_goals != null ? "jugado" : "programado",
        };
        if (leg.id) {
          const { error: e } = await db.from("tournament_matches").update(payload).eq("id", leg.id);
          if (e) throw e;
          keep.push(leg.id);
        } else {
          const { data: row, error: e } = await db
            .from("tournament_matches")
            .insert({ ...payload, created_by })
            .select("id")
            .single();
          if (e) throw e;
          keep.push(row.id as string);
        }
      }
      const remove = existingLegIds.filter((id) => !keep.includes(id));
      if (remove.length) {
        const { error: e } = await db.from("tournament_matches").delete().in("id", remove);
        if (e) throw e;
      }

      // Avance automático: el ganador ocupa su lugar en la ronda siguiente.
      if (tie.winner_team_id && tie.round_size > 2) {
        const nextRound = tie.round_size / 2;
        const nextSlot = Math.floor(tie.slot / 2);
        const side = tie.slot % 2 === 0 ? "home_team_id" : "away_team_id";
        const { data: existing } = await db
          .from("tournament_playoff_ties")
          .select("*")
          .eq("tournament_id", tie.tournament_id)
          .eq("round_size", nextRound)
          .eq("slot", nextSlot)
          .maybeSingle();
        const { error: e } = await db.from("tournament_playoff_ties").upsert(
          {
            ...(existing ?? {
              tournament_id: tie.tournament_id,
              club_id: tie.club_id,
              round_size: nextRound,
              slot: nextSlot,
              two_legs: tie.two_legs,
            }),
            [side]: tie.winner_team_id,
          },
          { onConflict: "tournament_id,round_size,slot" },
        );
        if (e) throw e;
      }
      return tieId;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["tournament-ties", v.tournament_id] });
      qc.invalidateQueries({ queryKey: ["tournament-matches", v.tournament_id] });
    },
  });
}

export function useDeleteTie() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tie: PlayoffTieRow) => {
      const { error } = await db.from("tournament_playoff_ties").delete().eq("id", tie.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["tournament-ties", v.tournament_id] });
      qc.invalidateQueries({ queryKey: ["tournament-matches", v.tournament_id] });
    },
  });
}

/** Partidos de una llave, ordenados por tramo. */
export function tieLegs(matches: MatchRow[], tieId: string | null | undefined): MatchRow[] {
  if (!tieId) return [];
  return matches
    .filter((m) => m.tie_id === tieId)
    .sort((a, b) => (a.leg ?? 1) - (b.leg ?? 1));
}
