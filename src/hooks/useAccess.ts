import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ModuleKey } from "@/lib/modules";

export type AccessLevel = "none" | "read" | "editor" | "approver";

export interface TeamOption {
  id: string | null; // null = club-wide membership
  name: string;
  category: string | null;
  roleId: string;
  roleName: string;
}

export interface AccessData {
  profile: { full_name: string | null; email: string | null; club_id: string | null } | null;
  clubName: string | null;
  teams: TeamOption[];
  // module → best access level across memberships
  permissions: Record<string, AccessLevel>;
  isSuperAdmin: boolean;
}

const RANK: Record<AccessLevel, number> = { none: 0, read: 1, editor: 2, approver: 3 };

export function useAccess(userId: string) {
  const qc = useQueryClient();
  useEffect(() => {
    const ch = supabase
      .channel(`role-perms-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "role_permissions" }, () => {
        qc.invalidateQueries({ queryKey: ["squad-access", userId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "roles" }, () => {
        qc.invalidateQueries({ queryKey: ["squad-access", userId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, qc]);
  return useQuery({
    queryKey: ["squad-access", userId],
    queryFn: async (): Promise<AccessData> => {
      const [profileRes, membershipsRes, superRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, email, club_id, club:clubs(name)")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("team_memberships")
          .select(
            "team_id, role_id, team:teams(name, category), role:roles(name, role_permissions(module_key, access_level))",
          )
          .eq("user_id", userId),
        supabase.from("super_admins").select("id").eq("user_id", userId).maybeSingle(),
      ]);

      if (profileRes.error) throw profileRes.error;
      if (membershipsRes.error) throw membershipsRes.error;

      const memberships = membershipsRes.data ?? [];
      const teams: TeamOption[] = memberships.map((m: any) => ({
        id: m.team_id,
        name: m.team?.name ?? "Todo el club",
        category: m.team?.category ?? null,
        roleId: m.role_id,
        roleName: m.role?.name ?? "",
      }));

      const permissions: Record<string, AccessLevel> = {};
      for (const m of memberships) {
        const perms = (m as any).role?.role_permissions ?? [];
        for (const p of perms) {
          const key = p.module_key as string;
          const lvl = p.access_level as AccessLevel;
          if (!permissions[key] || RANK[lvl] > RANK[permissions[key]]) {
            permissions[key] = lvl;
          }
        }
      }

      return {
        profile: profileRes.data
          ? {
              full_name: profileRes.data.full_name,
              email: profileRes.data.email,
              club_id: profileRes.data.club_id,
            }
          : null,
        clubName: (profileRes.data as any)?.club?.name ?? null,
        teams,
        permissions,
        isSuperAdmin: !!superRes.data,
      };
    },
  });
}

export function hasAccess(perms: Record<string, AccessLevel>, key: ModuleKey): boolean {
  const lvl = perms[key];
  return !!lvl && lvl !== "none";
}
