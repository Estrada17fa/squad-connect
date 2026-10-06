import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ModuleKey } from "@/lib/modules";
import {
  LEVEL_RANK,
  canRead,
  canSeeModule,
  isGlobalLevel,
  normalizeLevel,
  type PermissionLevel,
} from "@/lib/permissions";
import { sortTeams } from "@/lib/teamOrder";

/**
 * Escala vieja (`access_level`). Se conserva SOLO para la interfaz de
 * administración de permisos, que todavía escribe esa columna. Todas las
 * decisiones de la app usan `PermissionLevel`.
 */
export type AccessLevel = "none" | "read" | "editor" | "approver";

export interface TeamOption {
  id: string | null; // null = club-wide membership
  name: string;
  category: string | null;
  roleId: string;
  roleName: string;
  baseRole: string | null;
  displayOrder: number;
  isPrimary: boolean;
}

export interface AccessData {
  profile: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
    club_id: string | null;
  } | null;
  clubName: string | null;
  teams: TeamOption[];
  /** Equipos reales seleccionables en el header (club-wide => todos los del club). */
  teamOptions: TeamOption[];
  /** Categoría principal del club (default de selectores/pestañas). */
  primaryTeamId: string | null;
  /** Unión (mejor nivel) entre TODAS las membresías + overrides — equivalente a max_permission_any_team. */
  permissions: Record<string, PermissionLevel>;
  /** Permisos efectivos por equipo: la clave 'club' representa el ámbito club (o cuando no hay equipo activo). */
  permissionsByTeam: Record<string, Record<string, PermissionLevel>>;
  /** Niveles globales (lector_global / editor_global): aplican a CUALQUIER equipo. */
  globalPermissions: Record<string, PermissionLevel>;
  isSuperAdmin: boolean;
  /** true si TODAS las membresías del usuario son de rol base 'jugador' (y no es super admin). */
  isPlayerOnly: boolean;
  /** true si el usuario no tiene ninguna membresía en su club (acceso vacío). */
  noMemberships: boolean;
}


const RANK = LEVEL_RANK;
const TEAM_CLUB_KEY = "club";

function bumpLevel(target: Record<string, PermissionLevel>, key: string, lvl: PermissionLevel) {
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
      // Fuente única de verdad: get_my_access (effective_permission en SQL).
      // Las membresías propias solo se leen para nombres/rol base (mapa de páginas).
      const [profileRes, membershipsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, email, avatar_url, club_id, club:clubs(name)")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("team_memberships")
          .select("team_id, role_id, team:teams(name, category, display_order, is_primary), role:roles(name, base_role)")
          .eq("user_id", userId),
      ]);
      if (profileRes.error) throw profileRes.error;
      if (membershipsRes.error) throw membershipsRes.error;

      const profile = profileRes.data
        ? {
            full_name: profileRes.data.full_name,
            email: profileRes.data.email,
            avatar_url: profileRes.data.avatar_url,
            club_id: profileRes.data.club_id,
          }
        : null;
      const clubName = (profileRes.data as any)?.club?.name ?? null;
      const clubId = profileRes.data?.club_id ?? null;

      const memberships = (membershipsRes.data ?? []) as any[];
      const teams: TeamOption[] = memberships.map((m) => ({
        id: m.team_id,
        name: m.team?.name ?? "Todo el club",
        category: m.team?.category ?? null,
        roleId: m.role_id,
        roleName: m.role?.name ?? "",
        baseRole: m.role?.base_role ?? null,
        displayOrder: m.team?.display_order ?? 0,
        isPrimary: !!m.team?.is_primary,
      }));

      const empty: AccessData = {
        profile,
        clubName,
        teams,
        teamOptions: [],
        primaryTeamId: null,
        permissions: {},
        permissionsByTeam: { [TEAM_CLUB_KEY]: {} },
        globalPermissions: {},
        isSuperAdmin: false,
        isPlayerOnly: false,
        noMemberships: true,
      };
      if (!clubId) return empty;

      const { data: rpc, error: rpcErr } = await (supabase as any).rpc("get_my_access", {
        p_club_id: clubId,
      });
      if (rpcErr) {
        // Sin membresías en el club (p. ej. le quitaron la última): acceso vacío.
        if (rpcErr.code === "42501" || /forbidden/i.test(rpcErr.message ?? "")) return empty;
        throw rpcErr;
      }

      const res = rpc as {
        is_super_admin: boolean;
        club_levels: Record<string, string>;
        teams: {
          id: string;
          name: string;
          category: string | null;
          display_order: number | null;
          is_primary: boolean | null;
          levels: Record<string, string>;
        }[];
      };

      const normMap = (m: Record<string, string> | null | undefined) => {
        const out: Record<string, PermissionLevel> = {};
        for (const [k, v] of Object.entries(m ?? {})) out[k] = normalizeLevel(v);
        return out;
      };

      const clubWide = memberships.find((m) => !m.team_id);
      const permissionsByTeam: Record<string, Record<string, PermissionLevel>> = {
        [TEAM_CLUB_KEY]: normMap(res.club_levels),
      };
      const teamOptions: TeamOption[] = sortTeams(
        (res.teams ?? []).map((t) => {
          permissionsByTeam[t.id] = normMap(t.levels);
          const own = memberships.find((m) => m.team_id === t.id) ?? clubWide;
          return {
            id: t.id,
            name: t.name,
            category: t.category ?? null,
            roleId: own?.role_id ?? "",
            roleName: own?.role?.name ?? "",
            baseRole: own?.role?.base_role ?? null,
            displayOrder: t.display_order ?? 0,
            isPrimary: !!t.is_primary,
          };
        }),
      );

      const permissions: Record<string, PermissionLevel> = {};
      const globalPermissions: Record<string, PermissionLevel> = {};
      for (const map of Object.values(permissionsByTeam)) {
        for (const [k, v] of Object.entries(map)) {
          bumpLevel(permissions, k, v);
          if (isGlobalLevel(v)) bumpLevel(globalPermissions, k, v);
        }
      }

      const isSuper = !!res.is_super_admin;
      return {
        profile,
        clubName,
        teams,
        teamOptions,
        primaryTeamId: teamOptions.find((t) => t.isPrimary)?.id ?? teamOptions[0]?.id ?? null,
        permissions,
        permissionsByTeam,
        globalPermissions,
        isSuperAdmin: isSuper,
        isPlayerOnly:
          !isSuper &&
          teams.length > 0 &&
          teams.every((t) => (t.baseRole ?? "").toLowerCase() === "jugador"),
        noMemberships: !isSuper && memberships.length === 0,
      };
    },
  });
}

export function hasAccess(perms: Record<string, PermissionLevel>, key: ModuleKey): boolean {
  return canSeeModule(key, perms[key]);
}

