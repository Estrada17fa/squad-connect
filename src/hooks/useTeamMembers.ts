import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TeamMember {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role_name: string | null;
}

/** Members of a specific team (or all club members when teamId is null / club-wide). */
export function useTeamMembers(teamId: string | null | undefined, clubId: string | null | undefined) {
  return useQuery({
    queryKey: ["team-members", teamId ?? "club", clubId ?? "none"],
    enabled: !!clubId,
    queryFn: async (): Promise<TeamMember[]> => {
      const q = supabase
        .from("team_memberships")
        .select("user_id, profile:profiles!inner(id, full_name, email, avatar_url, club_id, status), role:roles(name)")
        .eq("profile.club_id", clubId!)
        .eq("profile.status", "activo");
      if (teamId) {
        // Include club-wide (team_id NULL) + specific team members.
        q.or(`team_id.is.null,team_id.eq.${teamId}`);
      }
      const { data, error } = await q;
      if (error) throw error;
      const seen = new Set<string>();
      const out: TeamMember[] = [];
      for (const row of data ?? []) {
        const p: any = (row as any).profile;
        if (!p || seen.has(p.id)) continue;
        seen.add(p.id);
        out.push({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          avatar_url: p.avatar_url,
          role_name: (row as any).role?.name ?? null,
        });
      }
      return out.sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
    },
  });
}
