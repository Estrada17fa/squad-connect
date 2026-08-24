import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { MatchStatus } from "@/lib/torneo";

/**
 * Gestión operativa de NUESTROS partidos (módulo 'partidos').
 *
 * No crea ni edita partidos: los LEE del torneo (fuente de la verdad de la
 * competencia) y sobre ese mismo partido guarda convocatoria y logística.
 */

const db = supabase as any;

export interface OurMatchTeam {
  id: string;
  name: string;
  short_name: string | null;
  crest_path: string | null;
  is_our_team: boolean;
}

export interface OurMatch {
  id: string;
  club_id: string;
  tournament_id: string;
  tournament_name: string;
  tournament_team_id: string | null;
  matchday: number | null;
  kickoff_at: string | null;
  venue: string | null;
  location_id: string | null;
  status: MatchStatus;
  home_goals: number | null;
  away_goals: number | null;
  home: OurMatchTeam | null;
  away: OurMatchTeam | null;
  /** Equipo del club (nuestro) y rival ya resueltos. */
  ours: OurMatchTeam | null;
  rival: OurMatchTeam | null;
  isHome: boolean;
  tie_id: string | null;
  calendar_event_id: string | null;
}

export interface CallupRow {
  id: string;
  match_id: string;
  user_id: string;
  player_profile_id: string | null;
  profile: { id: string; full_name: string | null; avatar_url: string | null } | null;
}

export interface MatchLogisticsRow {
  id: string;
  match_id: string;
  club_id: string;
  call_time_at: string | null;
  meeting_location_id: string | null;
  meeting_point: string | null;
  kit: string | null;
  logistics_notes: string | null;
  post_match_notes: string | null;
}

/* ------------------------------------------------------------------ */
/* Lectura                                                             */
/* ------------------------------------------------------------------ */

/** Partidos de los equipos marcados como "nuestro equipo", de todos los torneos visibles. */
export function useOurMatches(clubId: string | null | undefined) {
  const qc = useQueryClient();

  React.useEffect(() => {
    if (!clubId) return;
    const suffix = Math.random().toString(36).slice(2);
    const invalidate = () => qc.invalidateQueries({ queryKey: ["our-matches", clubId] });
    const ch = supabase
      .channel(`our-matches-${clubId}-${suffix}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tournament_matches" }, invalidate)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [clubId, qc]);

  return useQuery({
    queryKey: ["our-matches", clubId ?? "none"],
    enabled: !!clubId,
    queryFn: async (): Promise<OurMatch[]> => {
      const { data: tournaments, error: tErr } = await db
        .from("tournaments")
        .select("id, name, team_id")
        .eq("club_id", clubId);
      if (tErr) throw tErr;
      const tIds = (tournaments ?? []).map((t: any) => t.id);
      if (!tIds.length) return [];

      const [{ data: teams, error: teamErr }, { data: matches, error: mErr }] = await Promise.all([
        db
          .from("tournament_teams")
          .select("id, tournament_id, name, short_name, crest_path, is_our_team")
          .in("tournament_id", tIds),
        db
          .from("tournament_matches")
          .select(
            "id, club_id, tournament_id, matchday, kickoff_at, venue, location_id, status, home_goals, away_goals, home_team_id, away_team_id, tie_id, calendar_event_id",
          )
          .in("tournament_id", tIds),
      ]);
      if (teamErr) throw teamErr;
      if (mErr) throw mErr;

      const teamById = new Map<string, OurMatchTeam>();
      for (const t of teams ?? []) teamById.set(t.id, t as OurMatchTeam);
      const tournamentById = new Map<string, any>();
      for (const t of tournaments ?? []) tournamentById.set(t.id, t);

      const out: OurMatch[] = [];
      for (const m of matches ?? []) {
        const home = m.home_team_id ? teamById.get(m.home_team_id) ?? null : null;
        const away = m.away_team_id ? teamById.get(m.away_team_id) ?? null : null;
        if (!home?.is_our_team && !away?.is_our_team) continue;
        const isHome = !!home?.is_our_team;
        const tour = tournamentById.get(m.tournament_id);
        out.push({
          id: m.id,
          club_id: m.club_id,
          tournament_id: m.tournament_id,
          tournament_name: tour?.name ?? "Torneo",
          tournament_team_id: tour?.team_id ?? null,
          matchday: m.matchday,
          kickoff_at: m.kickoff_at,
          venue: m.venue,
          location_id: m.location_id,
          status: m.status,
          home_goals: m.home_goals,
          away_goals: m.away_goals,
          home,
          away,
          ours: isHome ? home : away,
          rival: isHome ? away : home,
          isHome,
          tie_id: m.tie_id ?? null,
          calendar_event_id: m.calendar_event_id ?? null,
        });
      }
      return out.sort((a, b) => (a.kickoff_at ?? "").localeCompare(b.kickoff_at ?? ""));
    },
  });
}

/** Convocados de un conjunto de partidos (o de uno solo). */
export function useMatchCallups(matchIds: string[]) {
  const qc = useQueryClient();
  const key = React.useMemo(() => [...matchIds].sort().join(","), [matchIds]);

  React.useEffect(() => {
    if (!key) return;
    const suffix = Math.random().toString(36).slice(2);
    const ch = supabase
      .channel(`match-callups-${suffix}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_callups" }, () =>
        qc.invalidateQueries({ queryKey: ["match-callups"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [key, qc]);

  return useQuery({
    queryKey: ["match-callups", key],
    enabled: matchIds.length > 0,
    queryFn: async (): Promise<CallupRow[]> => {
      const { data, error } = await db
        .from("match_callups")
        .select(
          "id, match_id, user_id, player_profile_id, profile:profiles!match_callups_user_id_fkey(id, full_name, avatar_url)",
        )
        .in("match_id", matchIds);
      if (error) throw error;
      return (data ?? []) as CallupRow[];
    },
  });
}

export function useMatchLogistics(matchIds: string[]) {
  const qc = useQueryClient();
  const key = React.useMemo(() => [...matchIds].sort().join(","), [matchIds]);

  React.useEffect(() => {
    if (!key) return;
    const suffix = Math.random().toString(36).slice(2);
    const ch = supabase
      .channel(`match-logistics-${suffix}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "match_logistics" }, () =>
        qc.invalidateQueries({ queryKey: ["match-logistics"] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [key, qc]);

  return useQuery({
    queryKey: ["match-logistics", key],
    enabled: matchIds.length > 0,
    queryFn: async (): Promise<MatchLogisticsRow[]> => {
      const { data, error } = await db.from("match_logistics").select("*").in("match_id", matchIds);
      if (error) throw error;
      return (data ?? []) as MatchLogisticsRow[];
    },
  });
}

/* ------------------------------------------------------------------ */
/* Mutaciones                                                          */
/* ------------------------------------------------------------------ */

export interface SaveCallupsInput {
  matchId: string;
  clubId: string;
  createdBy: string;
  /** Pares user_id / player_profile_id de la convocatoria final. */
  players: { userId: string; playerProfileId: string | null }[];
  current: CallupRow[];
}

export function useSaveCallups() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ matchId, clubId, createdBy, players, current }: SaveCallupsInput) => {
      const nextIds = new Set(players.map((p) => p.userId));
      const currentIds = new Set(current.map((c) => c.user_id));

      const toRemove = current.filter((c) => !nextIds.has(c.user_id)).map((c) => c.id);
      const toAdd = players.filter((p) => !currentIds.has(p.userId));

      if (toRemove.length) {
        const { error } = await db.from("match_callups").delete().in("id", toRemove);
        if (error) throw error;
      }
      if (toAdd.length) {
        const { error } = await db.from("match_callups").insert(
          toAdd.map((p) => ({
            match_id: matchId,
            club_id: clubId,
            user_id: p.userId,
            player_profile_id: p.playerProfileId,
            created_by: createdBy,
          })),
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["match-callups"] });
    },
  });
}

export interface SaveLogisticsInput {
  matchId: string;
  clubId: string;
  createdBy: string;
  call_time_at: string | null;
  meeting_location_id: string | null;
  meeting_point: string | null;
  kit: string | null;
  logistics_notes: string | null;
  post_match_notes: string | null;
}

export function useSaveMatchLogistics() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ matchId, clubId, createdBy, ...rest }: SaveLogisticsInput) => {
      const { error } = await db
        .from("match_logistics")
        .upsert(
          { match_id: matchId, club_id: clubId, created_by: createdBy, ...rest },
          { onConflict: "match_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["match-logistics"] });
    },
  });
}

/**
 * Partido asociado a un evento del calendario (para el detalle en Agenda).
 * La RLS de `tournament_matches` decide si el usuario puede verlo.
 */
export function useMatchByEvent(eventId: string | null | undefined) {
  return useQuery({
    queryKey: ["match-by-event", eventId ?? "none"],
    enabled: !!eventId,
    staleTime: 30_000,
    queryFn: async (): Promise<OurMatch | null> => {
      const { data: m, error } = await db
        .from("tournament_matches")
        .select(
          "id, club_id, tournament_id, matchday, kickoff_at, venue, location_id, status, home_goals, away_goals, home_team_id, away_team_id, tie_id, calendar_event_id",
        )
        .eq("calendar_event_id", eventId!)
        .maybeSingle();
      if (error) throw error;
      if (!m) return null;

      const [{ data: teams }, { data: tour }] = await Promise.all([
        db
          .from("tournament_teams")
          .select("id, tournament_id, name, short_name, crest_path, is_our_team")
          .eq("tournament_id", m.tournament_id),
        db.from("tournaments").select("id, name, team_id").eq("id", m.tournament_id).maybeSingle(),
      ]);
      const byId = new Map<string, OurMatchTeam>();
      for (const t of teams ?? []) byId.set(t.id, t as OurMatchTeam);
      const home = m.home_team_id ? byId.get(m.home_team_id) ?? null : null;
      const away = m.away_team_id ? byId.get(m.away_team_id) ?? null : null;
      const isHome = !!home?.is_our_team;
      return {
        id: m.id,
        club_id: m.club_id,
        tournament_id: m.tournament_id,
        tournament_name: (tour as any)?.name ?? "Torneo",
        tournament_team_id: (tour as any)?.team_id ?? null,
        matchday: m.matchday,
        kickoff_at: m.kickoff_at,
        venue: m.venue,
        location_id: m.location_id,
        status: m.status,
        home_goals: m.home_goals,
        away_goals: m.away_goals,
        home,
        away,
        ours: isHome ? home : away,
        rival: isHome ? away : home,
        isHome,
        tie_id: m.tie_id ?? null,
        calendar_event_id: m.calendar_event_id ?? null,
      };
    },
  });
}
