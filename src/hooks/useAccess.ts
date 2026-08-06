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
  baseRole: string | null;
}

export interface AccessData {
  profile: { full_name: string | null; email: string | null; club_id: string | null } | null;
  clubName: string | null;
  teams: TeamOption[];
  /** Equipos reales seleccionables en el header (club-wide => todos los del club). */
  teamOptions: TeamOption[];
  /** Unión (mejor nivel) entre TODAS las membresías + overrides. Úsalo solo para decisiones globales (bottom nav). */
  permissions: Record<string, AccessLevel>;
  /** Permisos efectivos por equipo: la clave 'club' representa el ámbito club (o cuando no hay equipo activo). */
  permissionsByTeam: Record<string, Record<string, AccessLevel>>;
  isSuperAdmin: boolean;
  /** true si TODAS las membresías del usuario son de rol base 'jugador' (y no es super admin). */
  isPlayerOnly: boolean;
}


const RANK: Record<AccessLevel, number> = { none: 0, read: 1, editor: 2, approver: 3 };
const TEAM_CLUB_KEY = "club";

function bumpLevel(target: Record<string, AccessLevel>, key: string, lvl: AccessLevel) {
  if (!target[key] || RANK[lvl] > RANK[target[key]]) target[key] = lvl;
}

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
      .on("postgres_changes", { event: "*", schema: "public", table: "user_permission_overrides", filter: `user_id=eq.${userId}` }, () => {
        qc.invalidateQueries({ queryKey: ["squad-access", userId] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "team_memberships", filter: `user_id=eq.${userId}` }, () => {
        qc.invalidateQueries({ queryKey: ["squad-access", userId] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, qc]);
  return useQuery({
    queryKey: ["squad-access", userId],
    // Permisos y membresías cambian raramente; se invalidan por realtime
    // cuando cambian roles/permisos, así que no revalidamos al navegar.
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<AccessData> => {
      const [profileRes, membershipsRes, superRes, overridesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, email, club_id, club:clubs(name)")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("team_memberships")
          .select(
            "team_id, role_id, team:teams(name, category), role:roles(name, base_role, role_permissions(module_key, access_level))",
          )
          .eq("user_id", userId),
        supabase.from("super_admins").select("id").eq("user_id", userId).maybeSingle(),
        supabase
          .from("user_permission_overrides")
          .select("team_id, module_key, access_level")
          .eq("user_id", userId),
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
        baseRole: m.role?.base_role ?? null,
      }));

      // Opciones reales de equipo para el selector del header.
      const clubId = profileRes.data?.club_id ?? null;
      const clubWide = memberships.find((m: any) => !m.team_id) as any | undefined;
      let teamOptions: TeamOption[] = teams.filter((t) => t.id);
      if (clubId && (clubWide || superRes.data)) {
        const { data: clubTeams } = await supabase
          .from("teams")
          .select("id, name, category")
          .eq("club_id", clubId)
          .order("name");
        const extras: TeamOption[] = (clubTeams ?? []).map((t: any) => ({
          id: t.id,
          name: t.name,
          category: t.category ?? null,
          roleId: clubWide?.role_id ?? "",
          roleName: clubWide?.role?.name ?? "",
          baseRole: clubWide?.role?.base_role ?? null,
        }));
        const seen = new Set(teamOptions.map((t) => t.id));
        teamOptions = [...teamOptions, ...extras.filter((t) => !seen.has(t.id))];
      }
      teamOptions.sort((a, b) => a.name.localeCompare(b.name));


      // Permisos por membresía (por team_id o 'club' si team_id NULL)
      const byMembership: Record<string, Record<string, AccessLevel>> = {};
      for (const m of memberships as any[]) {
        const key = m.team_id ?? TEAM_CLUB_KEY;
        byMembership[key] ??= {};
        const perms = m.role?.role_permissions ?? [];
        for (const p of perms) bumpLevel(byMembership[key], p.module_key, p.access_level as AccessLevel);
      }

      // Overrides
      const overrides = overridesRes.data ?? [];
      const overridesByTeam: Record<string, Record<string, AccessLevel>> = {};
      for (const o of overrides as any[]) {
        const key = o.team_id ?? TEAM_CLUB_KEY;
        overridesByTeam[key] ??= {};
        overridesByTeam[key][o.module_key] = o.access_level as AccessLevel;
      }

      // Permisos efectivos por equipo: club-wide (membresías con team_id NULL) siempre se suman a cada equipo
      const teamIds = Array.from(new Set(memberships.map((m: any) => m.team_id).filter(Boolean))) as string[];
      const permissionsByTeam: Record<string, Record<string, AccessLevel>> = {};

      const clubBase = byMembership[TEAM_CLUB_KEY] ?? {};
      const clubOverride = overridesByTeam[TEAM_CLUB_KEY] ?? {};
      // Contexto 'club' (sin equipo o módulos scope=club)
      {
        const merged: Record<string, AccessLevel> = { ...clubBase };
        for (const [k, v] of Object.entries(clubOverride)) merged[k] = v;
        permissionsByTeam[TEAM_CLUB_KEY] = merged;
      }
      for (const tid of teamIds) {
        const merged: Record<string, AccessLevel> = { ...clubBase };
        for (const [k, v] of Object.entries(byMembership[tid] ?? {})) bumpLevel(merged, k, v);
        // Overrides club-wide primero, luego los específicos del equipo pisan
        for (const [k, v] of Object.entries(clubOverride)) merged[k] = v;
        for (const [k, v] of Object.entries(overridesByTeam[tid] ?? {})) merged[k] = v;
        permissionsByTeam[tid] = merged;
      }

      // Unión (para bottom nav): mejor nivel entre todos los contextos
      const permissions: Record<string, AccessLevel> = {};
      for (const map of Object.values(permissionsByTeam)) {
        for (const [k, v] of Object.entries(map)) bumpLevel(permissions, k, v);
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
        permissionsByTeam,
        isSuperAdmin: !!superRes.data,
        isPlayerOnly:
          !superRes.data &&
          teams.length > 0 &&
          teams.every((t) => (t.baseRole ?? "").toLowerCase() === "jugador"),
      };
    },
  });
}

export function hasAccess(perms: Record<string, AccessLevel>, key: ModuleKey): boolean {
  const lvl = perms[key];
  return !!lvl && lvl !== "none";
}
