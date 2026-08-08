import { queryOptions, useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BaseRole } from "@/lib/rolePages";
import { inferBaseRole } from "@/lib/rolePages";
import type { AvailabilityStatus } from "./usePlayers";

export interface RosterMember {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  birthdate: string | null;
  roleName: string | null;
  baseRole: BaseRole;
  jobTitle: string | null;
  teamName: string | null;
  playerId: string | null;
  jerseyNumber: number | null;
  position: string | null;
  availability: AvailabilityStatus | null;
}

async function fetchRoster(clubId: string, teamId: string | null): Promise<RosterMember[]> {
  const q = supabase
    .from("team_memberships")
    .select(
      "user_id, team_id, job_title, team:teams(name), role:roles(name, base_role), profile:profiles!inner(id, full_name, avatar_url, birthdate, club_id, status)",
    )
    .eq("profile.club_id", clubId)
    .eq("profile.status", "activo");
  if (teamId) q.or(`team_id.is.null,team_id.eq.${teamId}`);
  const { data, error } = await q;
  if (error) throw error;

  let players: { id: string; user_id: string; team_id: string; jersey_number: number | null; position: string | null; availability_status: string | null }[] = [];
  if (teamId) {
    players =
      (
        await supabase
          .from("player_profiles")
          .select("id, user_id, team_id, jersey_number, position, availability_status")
          .eq("team_id", teamId)
          .is("archived_at", null)
      ).data ?? [];
  } else {
    // Club-wide: traer todos los player_profiles de equipos del club.
    const { data: teamRows } = await supabase.from("teams").select("id").eq("club_id", clubId);
    const ids = (teamRows ?? []).map((t: any) => t.id);
    if (ids.length > 0) {
      players =
        (
          await supabase
            .from("player_profiles")
            .select("id, user_id, team_id, jersey_number, position, availability_status")
            .in("team_id", ids)
            .is("archived_at", null)
        ).data ?? [];
    }
  }
  const byUser = new Map<string, (typeof players)[number]>();
  for (const p of players) byUser.set(p.user_id, p);

  const seen = new Map<string, RosterMember>();
  for (const row of (data ?? []) as any[]) {
    const uid = row.user_id as string;
    const baseRole = (row.role?.base_role as BaseRole | null) ?? inferBaseRole(row.role?.name);
    const isTeamSpecific = !!row.team_id;
    const existing = seen.get(uid);
    if (existing && !isTeamSpecific) continue;
    const player = byUser.get(uid);
    seen.set(uid, {
      userId: uid,
      fullName: row.profile?.full_name ?? null,
      avatarUrl: row.profile?.avatar_url ?? null,
      birthdate: row.profile?.birthdate ?? null,
      roleName: row.role?.name ?? null,
      baseRole,
      jobTitle: row.job_title ?? null,
      teamName: row.team?.name ?? null,
      playerId: baseRole === "jugador" ? player?.id ?? null : null,
      jerseyNumber: baseRole === "jugador" ? player?.jersey_number ?? null : null,
      position: baseRole === "jugador" ? player?.position ?? null : null,
      availability: baseRole === "jugador"
        ? ((player?.availability_status as AvailabilityStatus | undefined) ?? null)
        : null,
    });
  }

  return [...seen.values()].sort((a, b) => (a.fullName ?? "").localeCompare(b.fullName ?? ""));
}

export const rosterQueryOptions = (
  clubId: string | null | undefined,
  teamId: string | null | undefined,
) =>
  queryOptions({
    queryKey: ["roster", clubId ?? "none", teamId ?? "club"] as const,
    enabled: !!clubId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    queryFn: () => fetchRoster(clubId!, teamId ?? null),
  });

export function useRoster(clubId: string | null | undefined, teamId: string | null | undefined) {
  return useQuery(rosterQueryOptions(clubId, teamId));
}
