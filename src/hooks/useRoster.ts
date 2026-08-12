import { queryOptions, useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BaseRole } from "@/lib/rolePages";
import { inferBaseRole } from "@/lib/rolePages";
import type { AvailabilityStatus } from "./usePlayers";

export interface RosterMember {
  userId: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  birthdate: string | null;
  roleName: string | null;
  baseRole: BaseRole;
  jobTitle: string | null;
  /** Categoría real de la persona: la del jugador viene de su ficha deportiva. */
  teamId: string | null;
  teamName: string | null;
  playerId: string | null;
  jerseyNumber: number | null;
  position: string | null;
  secondaryPosition: string | null;
  preferredFoot: string | null;
  nationality: string | null;
  birthplace: string | null;
  heightCm: number | null;
  weightKg: number | null;
  availability: AvailabilityStatus | null;
}

interface PlayerLite {
  id: string;
  user_id: string;
  team_id: string;
  jersey_number: number | null;
  position: string | null;
  secondary_position: string | null;
  preferred_foot: string | null;
  nationality: string | null;
  birthplace: string | null;
  birthdate: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  availability_status: string | null;
}

const PLAYER_COLUMNS =
  "id, user_id, team_id, jersey_number, position, secondary_position, preferred_foot, nationality, birthplace, birthdate, height_cm, weight_kg, availability_status";

async function fetchRoster(clubId: string, teamId: string | null): Promise<RosterMember[]> {
  const q = supabase
    .from("team_memberships")
    .select(
      "user_id, team_id, job_title, team:teams(id, name), role:roles(name, base_role), profile:profiles!inner(id, full_name, email, phone, avatar_url, birthdate, club_id, status)",
    )
    .eq("profile.club_id", clubId)
    .eq("profile.status", "activo");
  if (teamId) q.or(`team_id.is.null,team_id.eq.${teamId}`);
  const { data, error } = await q;
  if (error) throw error;

  let players: PlayerLite[] = [];
  const teamNameById = new Map<string, string>();
  if (teamId) {
    players =
      ((
        await supabase.from("player_profiles").select(PLAYER_COLUMNS).eq("team_id", teamId).is("archived_at", null)
      ).data as PlayerLite[] | null) ?? [];
  } else {
    const { data: teamRows } = await supabase.from("teams").select("id, name").eq("club_id", clubId);
    for (const t of teamRows ?? []) teamNameById.set(t.id, t.name);
    const ids = (teamRows ?? []).map((t) => t.id);
    if (ids.length > 0) {
      players =
        ((
          await supabase.from("player_profiles").select(PLAYER_COLUMNS).in("team_id", ids).is("archived_at", null)
        ).data as PlayerLite[] | null) ?? [];
    }
  }
  const byUser = new Map<string, PlayerLite>();
  for (const p of players) byUser.set(p.user_id, p);

  const seen = new Map<string, RosterMember>();
  for (const row of (data ?? []) as any[]) {
    const uid = row.user_id as string;
    if (row.team?.id && row.team?.name) teamNameById.set(row.team.id, row.team.name);
    const baseRole = (row.role?.base_role as BaseRole | null) ?? inferBaseRole(row.role?.name);
    const isTeamSpecific = !!row.team_id;
    const existing = seen.get(uid);
    if (existing && !isTeamSpecific) continue;
    const player = baseRole === "jugador" ? byUser.get(uid) ?? null : null;

    // La categoría del jugador la manda su ficha deportiva: evita que salga
    // como "Todo el club" cuando su membresía es global.
    const resolvedTeamId = player?.team_id ?? (row.team_id as string | null) ?? null;
    const resolvedTeamName =
      (resolvedTeamId ? teamNameById.get(resolvedTeamId) : null) ?? row.team?.name ?? null;

    seen.set(uid, {
      userId: uid,
      fullName: row.profile?.full_name ?? null,
      email: row.profile?.email ?? null,
      phone: row.profile?.phone ?? null,
      avatarUrl: row.profile?.avatar_url ?? null,
      birthdate: player?.birthdate ?? row.profile?.birthdate ?? null,
      roleName: row.role?.name ?? null,
      baseRole,
      jobTitle: row.job_title ?? null,
      teamId: resolvedTeamId,
      teamName: resolvedTeamName,
      playerId: player?.id ?? null,
      jerseyNumber: player?.jersey_number ?? null,
      position: player?.position ?? null,
      secondaryPosition: player?.secondary_position ?? null,
      preferredFoot: player?.preferred_foot ?? null,
      nationality: player?.nationality ?? null,
      birthplace: player?.birthplace ?? null,
      heightCm: player?.height_cm ?? null,
      weightKg: player?.weight_kg ?? null,
      availability: (player?.availability_status as AvailabilityStatus | undefined) ?? null,
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
