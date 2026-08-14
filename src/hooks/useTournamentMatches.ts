import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MatchStatus } from "@/lib/torneo";

/**
 * Torneo — Parte 2: partidos, resultados, goleo y ajustes de puntos.
 * RLS resuelve la visibilidad (can_view_module / can_edit_module sobre la categoría).
 */

const db = supabase as any;

export interface MatchRow {
  id: string;
  tournament_id: string;
  club_id: string;
  matchday: number | null;
  home_team_id: string | null;
  away_team_id: string | null;
  kickoff_at: string | null;
  location_id: string | null;
  venue: string | null;
  home_goals: number | null;
  away_goals: number | null;
  shootout_winner_team_id: string | null;
  status: MatchStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalRow {
  id: string;
  match_id: string;
  tournament_id: string;
  club_id: string;
  team_id: string;
  player_user_id: string | null;
  player_name: string | null;
  goals: number;
  notes: string | null;
}

export interface AdjustmentRow {
  id: string;
  tournament_id: string;
  team_id: string;
  club_id: string;
  points: number;
  reason: string | null;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Realtime                                                            */
/* ------------------------------------------------------------------ */

function useMatchesRealtime(tournamentId: string | null | undefined) {
  const qc = useQueryClient();
  React.useEffect(() => {
    if (!tournamentId) return;
    const suffix = Math.random().toString(36).slice(2);
    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ["tournament-matches", tournamentId] });
      qc.invalidateQueries({ queryKey: ["tournament-goals", tournamentId] });
      qc.invalidateQueries({ queryKey: ["tournament-adjustments", tournamentId] });
    };
    const ch = supabase
      .channel(`torneo-matches-${tournamentId}-${suffix}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_matches" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_match_goals" }, invalidate)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tournament_point_adjustments" },
        invalidate,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [tournamentId, qc]);
}

/* ------------------------------------------------------------------ */
/* Consultas                                                           */
/* ------------------------------------------------------------------ */

export function useTournamentMatches(tournamentId: string | null | undefined) {
  useMatchesRealtime(tournamentId);
  return useQuery({
    queryKey: ["tournament-matches", tournamentId ?? "none"],
    enabled: !!tournamentId,
    queryFn: async (): Promise<MatchRow[]> => {
      const { data, error } = await db
        .from("tournament_matches")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("matchday", { ascending: true, nullsFirst: false })
        .order("kickoff_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTournamentGoals(tournamentId: string | null | undefined) {
  return useQuery({
    queryKey: ["tournament-goals", tournamentId ?? "none"],
    enabled: !!tournamentId,
    queryFn: async (): Promise<GoalRow[]> => {
      const { data, error } = await db
        .from("tournament_match_goals")
        .select("*")
        .eq("tournament_id", tournamentId);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTournamentAdjustments(tournamentId: string | null | undefined) {
  return useQuery({
    queryKey: ["tournament-adjustments", tournamentId ?? "none"],
    enabled: !!tournamentId,
    queryFn: async (): Promise<AdjustmentRow[]> => {
      const { data, error } = await db
        .from("tournament_point_adjustments")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/* ------------------------------------------------------------------ */
/* Mutaciones                                                          */
/* ------------------------------------------------------------------ */

export interface MatchInput {
  id?: string;
  tournament_id: string;
  club_id: string;
  matchday: number | null;
  home_team_id: string | null;
  away_team_id: string | null;
  kickoff_at: string | null;
  location_id: string | null;
  venue: string | null;
  status: MatchStatus;
  notes: string | null;
  created_by?: string;
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>, tournamentId: string) {
  qc.invalidateQueries({ queryKey: ["tournament-matches", tournamentId] });
  qc.invalidateQueries({ queryKey: ["tournament-goals", tournamentId] });
  qc.invalidateQueries({ queryKey: ["tournament-adjustments", tournamentId] });
}

export function useSaveMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: MatchInput) => {
      const { id, created_by, ...rest } = input;
      if (id) {
        const { error } = await db.from("tournament_matches").update(rest).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await db
        .from("tournament_matches")
        .insert({ ...rest, created_by })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (_d, v) => invalidateAll(qc, v.tournament_id),
  });
}

/** Alta de varios partidos de una misma jornada. */
export function useSaveMatchday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: MatchInput[]) => {
      if (!rows.length) return 0;
      const payload = rows.map(({ id: _id, created_by, ...rest }) => ({ ...rest, created_by }));
      const { error } = await db.from("tournament_matches").insert(payload);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (_d, v) => {
      if (v[0]) invalidateAll(qc, v[0].tournament_id);
    },
  });
}

export function useDeleteMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: MatchRow) => {
      const { error } = await db.from("tournament_matches").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => invalidateAll(qc, v.tournament_id),
  });
}

export interface GoalInput {
  team_id: string;
  player_user_id: string | null;
  player_name: string | null;
  goals: number;
}

export interface ResultInput {
  match: MatchRow;
  home_goals: number;
  away_goals: number;
  shootout_winner_team_id: string | null;
  goals: GoalInput[];
  created_by: string;
}

/** Guarda marcador + goleadores del partido en una sola operación. */
export function useSaveMatchResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: ResultInput) => {
      const { match } = input;
      const { error: upErr } = await db
        .from("tournament_matches")
        .update({
          home_goals: input.home_goals,
          away_goals: input.away_goals,
          shootout_winner_team_id: input.shootout_winner_team_id,
          status: "jugado",
        })
        .eq("id", match.id);
      if (upErr) throw upErr;

      const { error: delErr } = await db
        .from("tournament_match_goals")
        .delete()
        .eq("match_id", match.id);
      if (delErr) throw delErr;

      const rows = input.goals
        .filter((g) => g.team_id && g.goals > 0)
        .map((g) => ({
          match_id: match.id,
          tournament_id: match.tournament_id,
          club_id: match.club_id,
          team_id: g.team_id,
          player_user_id: g.player_user_id,
          player_name: g.player_name,
          goals: g.goals,
          created_by: input.created_by,
        }));
      if (rows.length) {
        const { error } = await db.from("tournament_match_goals").insert(rows);
        if (error) throw error;
      }
    },
    onSuccess: (_d, v) => invalidateAll(qc, v.match.tournament_id),
  });
}

export function useSaveAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      tournament_id: string;
      club_id: string;
      team_id: string;
      points: number;
      reason: string | null;
      created_by: string;
    }) => {
      const { id, created_by, ...rest } = input;
      if (id) {
        const { error } = await db.from("tournament_point_adjustments").update(rest).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { error } = await db
        .from("tournament_point_adjustments")
        .insert({ ...rest, created_by });
      if (error) throw error;
      return null;
    },
    onSuccess: (_d, v) => invalidateAll(qc, v.tournament_id),
  });
}

export function useDeleteAdjustment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: AdjustmentRow) => {
      const { error } = await db.from("tournament_point_adjustments").delete().eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: (_d, v) => invalidateAll(qc, v.tournament_id),
  });
}
