import * as React from "react";
import { queryOptions, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AvailabilityStatus = "apto" | "lesionado" | "en_duda";

export interface PlayerRow {
  id: string;
  user_id: string;
  team_id: string;
  position: string | null;
  jersey_number: number | null;
  birthdate: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  availability_status: AvailabilityStatus;
  notes: string | null;
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

export const playersQueryOptions = (teamId: string | null | undefined) =>
  queryOptions({
    queryKey: ["players", teamId ?? "none"] as const,
    enabled: !!teamId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<PlayerRow[]> => {
      const { data, error } = await supabase
        .from("player_profiles")
        .select(
          "id, user_id, team_id, position, jersey_number, birthdate, height_cm, weight_kg, availability_status, notes, profile:profiles(id, full_name, email, avatar_url)",
        )
        .eq("team_id", teamId!)
        .is("archived_at", null);
      if (error) throw error;
      return (data ?? []) as unknown as PlayerRow[];
    },
  });

export function usePlayers(teamId: string | null | undefined) {
  const qc = useQueryClient();
  const query = useQuery(playersQueryOptions(teamId));

  React.useEffect(() => {
    if (!teamId) return;
    const channel = supabase
      .channel(`players-${teamId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "player_profiles", filter: `team_id=eq.${teamId}` },
        () => qc.invalidateQueries({ queryKey: ["players", teamId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, qc]);

  return query;
}

export function usePlayer(playerId: string | undefined) {
  return useQuery({
    queryKey: ["player", playerId ?? "none"],
    enabled: !!playerId,
    staleTime: 30_000,
    queryFn: async (): Promise<PlayerRow | null> => {
      const { data, error } = await supabase
        .from("player_profiles")
        .select(
          "id, user_id, team_id, position, jersey_number, birthdate, height_cm, weight_kg, availability_status, notes, profile:profiles(id, full_name, email, avatar_url)",
        )
        .eq("id", playerId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as PlayerRow | null;
    },
  });
}
