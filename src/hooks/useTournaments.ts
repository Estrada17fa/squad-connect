import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  parseTiebreakers,
  type PointsConfig,
  type TournamentFormat,
  type TournamentStatus,
  type TournamentType,
} from "@/lib/torneo";

/**
 * Módulo Torneo (module_key 'torneo', ámbito categoría).
 * La visibilidad la garantiza RLS con can_view_module / can_edit_module.
 */

const db = supabase as any;
export const CREST_BUCKET = "tournament-crests";

/** Formato de la fase regular y configuración opcional de fase final. */
export interface TournamentFormatConfig {
  format: TournamentFormat;
  groups_count: number;
  has_playoffs: boolean;
  playoff_start_round: number;
  playoff_two_legs: boolean;
}

export interface TournamentRow extends PointsConfig, TournamentFormatConfig {
  id: string;
  club_id: string;
  team_id: string;
  name: string;
  season: string | null;
  type: TournamentType;
  status: TournamentStatus;
  notes: string | null;
  logo_path: string | null;
  created_at: string;
  updated_at: string;
  team_name: string | null;
  teams_count: number;
}

export interface TournamentTeamRow {
  id: string;
  tournament_id: string;
  club_id: string;
  name: string;
  short_name: string | null;
  crest_path: string | null;
  is_our_team: boolean;
  group_label: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TournamentInput extends PointsConfig, TournamentFormatConfig {
  id?: string;
  club_id: string;
  team_id: string;
  name: string;
  season: string | null;
  type: TournamentType;
  status: TournamentStatus;
  notes: string | null;
  logo_path: string | null;
  created_by: string;
}


/* ------------------------------------------------------------------ */
/* Realtime                                                            */
/* ------------------------------------------------------------------ */

function useTournamentsRealtime(clubId: string | null | undefined) {
  const qc = useQueryClient();
  React.useEffect(() => {
    if (!clubId) return;
    const suffix = Math.random().toString(36).slice(2);
    const ch = supabase
      .channel(`torneo-${clubId}-${suffix}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournaments" }, () =>
        qc.invalidateQueries({ queryKey: ["tournaments", clubId] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_teams" }, () => {
        qc.invalidateQueries({ queryKey: ["tournaments", clubId] });
        qc.invalidateQueries({ queryKey: ["tournament-teams"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [clubId, qc]);
}

/* ------------------------------------------------------------------ */
/* Consultas                                                           */
/* ------------------------------------------------------------------ */

export function useTournaments(clubId: string | null | undefined) {
  useTournamentsRealtime(clubId);
  return useQuery({
    queryKey: ["tournaments", clubId ?? "none"],
    enabled: !!clubId,
    queryFn: async (): Promise<TournamentRow[]> => {
      const { data, error } = await db
        .from("tournaments")
        .select("*, teams(name), tournament_teams(id)")
        .eq("club_id", clubId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        ...row,
        tiebreakers: parseTiebreakers(row.tiebreakers),
        team_name: row.teams?.name ?? null,
        teams_count: (row.tournament_teams ?? []).length,
      }));
    },
  });
}

export function useTournamentTeams(tournamentId: string | null | undefined) {
  return useQuery({
    queryKey: ["tournament-teams", tournamentId ?? "none"],
    enabled: !!tournamentId,
    queryFn: async (): Promise<TournamentTeamRow[]> => {
      const { data, error } = await db
        .from("tournament_teams")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("is_our_team", { ascending: false })
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** URL firmada del escudo (bucket privado). */
export function useCrestUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["tournament-crest", path ?? "none"],
    enabled: !!path,
    staleTime: 45 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(CREST_BUCKET)
        .createSignedUrl(path as string, 60 * 60);
      if (error) throw error;
      return data?.signedUrl ?? null;
    },
  });
}

/* ------------------------------------------------------------------ */
/* Mutaciones                                                          */
/* ------------------------------------------------------------------ */

export function useSaveTournament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TournamentInput) => {
      const { id, created_by, ...rest } = input;
      const payload = { ...rest, tiebreakers: rest.tiebreakers as unknown as any };
      if (id) {
        const { error } = await db.from("tournaments").update(payload).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await db
        .from("tournaments")
        .insert({ ...payload, created_by })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tournaments"] }),
  });
}

export function useDeleteTournament() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: TournamentRow) => {
      const { error } = await db.from("tournaments").delete().eq("id", t.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tournaments"] }),
  });
}

export interface TournamentTeamInput {
  id?: string;
  tournament_id: string;
  club_id: string;
  name: string;
  short_name: string | null;
  crest_path: string | null;
  is_our_team: boolean;
  group_label: string | null;
  notes: string | null;

}

export function useSaveTournamentTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TournamentTeamInput) => {
      const { id, ...rest } = input;
      // Solo puede haber un "nuestro equipo" por torneo.
      if (rest.is_our_team) {
        const q = db
          .from("tournament_teams")
          .update({ is_our_team: false })
          .eq("tournament_id", rest.tournament_id)
          .eq("is_our_team", true);
        const { error } = id ? await q.neq("id", id) : await q;
        if (error) throw error;
      }
      if (id) {
        const { error } = await db.from("tournament_teams").update(rest).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await db
        .from("tournament_teams")
        .insert(rest)
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["tournament-teams", v.tournament_id] });
      qc.invalidateQueries({ queryKey: ["tournaments"] });
    },
  });
}

export function useDeleteTournamentTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: TournamentTeamRow) => {
      const { error } = await db.from("tournament_teams").delete().eq("id", row.id);
      if (error) throw error;
      if (row.crest_path) await supabase.storage.from(CREST_BUCKET).remove([row.crest_path]);
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ["tournament-teams", v.tournament_id] });
      qc.invalidateQueries({ queryKey: ["tournaments"] });
    },
  });
}
