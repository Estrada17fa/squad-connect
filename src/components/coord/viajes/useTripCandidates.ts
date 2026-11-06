import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { travelerGroup } from "@/lib/viajes";

export interface TripCandidate {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role_name: string | null;
  position: string | null;
  jersey: number | null;
  group: "jugadores" | "staff";
}

/**
 * Personas de la categoría del viaje con su ROL en esa categoría (de ahí sale
 * si van en Jugadores o en Staff) y, para jugadores, su posición y dorsal.
 */
export function useTripCandidates(clubId: string | null | undefined, teamId: string | null | undefined) {
  return useQuery({
    queryKey: ["trip-candidates", clubId ?? "none", teamId ?? "none"],
    enabled: !!clubId && !!teamId,
    queryFn: async (): Promise<TripCandidate[]> => {
      const [mRes, pRes] = await Promise.all([
        supabase
          .from("team_memberships")
          .select("user_id, role:roles(name), profile:profiles!inner(id, full_name, email, avatar_url, club_id, status)")
          .eq("team_id", teamId!)
          .eq("profile.club_id", clubId!)
          .eq("profile.status", "activo"),
        supabase.from("player_profiles").select("user_id, position, jersey_number, archived_at").eq("team_id", teamId!).is("archived_at", null),
      ]);
      if (mRes.error) throw mRes.error;
      const pos = new Map<string, { position: string | null; jersey: number | null }>();
      for (const p of (pRes.data ?? []) as any[]) pos.set(p.user_id, { position: p.position ?? null, jersey: p.jersey_number ?? null });
      const out = new Map<string, TripCandidate>();
      for (const row of (mRes.data ?? []) as any[]) {
        const p = row.profile;
        if (!p) continue;
        const role = row.role?.name ?? null;
        const prev = out.get(p.id);
        // Si tiene varias membresías en la categoría, Jugador gana para clasificar.
        if (prev && prev.group === "jugadores") continue;
        out.set(p.id, {
          id: p.id, full_name: p.full_name, email: p.email, avatar_url: p.avatar_url,
          role_name: role, position: pos.get(p.id)?.position ?? null, jersey: pos.get(p.id)?.jersey ?? null,
          group: travelerGroup(role),
        });
      }
      return [...out.values()].sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
    },
  });
}
