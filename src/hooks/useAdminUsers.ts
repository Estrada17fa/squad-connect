import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMembersLastSignIn } from "@/lib/members.signin.functions";
import { inferBaseRole } from "@/lib/rolePages";
import type { MembershipLite } from "@/components/usuarios/memberUtils";

export interface AdminMember {
  id: string;
  full_name: string | null;
  first_name: string | null;
  paternal_last_name: string | null;
  maternal_last_name: string | null;
  name_completed: boolean | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: "activo" | "baja" | null;
  created_at: string | null;
  must_change_password: boolean | null;
  birthdate: string | null;
  birthplace: string | null;
  nationality: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  jersey_number: number | null;
}

export interface AdminRole {
  id: string;
  club_id: string;
  name: string;
  is_system_default: boolean;
  allows_club_wide: boolean;
  base_role: string | null;
  default_all_categories: boolean;
}

export interface AdminTeam {
  id: string;
  name: string;
  category: string | null;
}

const MEMBER_COLS =
  "id, full_name, first_name, paternal_last_name, maternal_last_name, name_completed, email, phone, avatar_url, status, created_at, must_change_password, birthdate, birthplace, nationality, emergency_contact_name, emergency_contact_phone, jersey_number";

export function useAdminUsers(clubId: string | null | undefined) {
  const enabled = !!clubId;
  const lastSignInFn = useServerFn(getMembersLastSignIn);

  const members = useQuery({
    queryKey: ["adm-members", clubId],
    enabled,
    queryFn: async (): Promise<AdminMember[]> => {
      const { data, error } = await supabase.from("profiles").select(MEMBER_COLS).eq("club_id", clubId!).order("full_name");
      if (error) throw error;
      return (data ?? []) as unknown as AdminMember[];
    },
  });

  const roles = useQuery({
    queryKey: ["adm-roles", clubId],
    enabled,
    queryFn: async (): Promise<AdminRole[]> => {
      const { data, error } = await supabase
        .from("roles")
        .select("id, club_id, name, is_system_default, allows_club_wide, base_role, default_all_categories")
        .eq("club_id", clubId!)
        .order("is_system_default", { ascending: false })
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as AdminRole[];
    },
  });

  const teams = useQuery({
    queryKey: ["club-teams-min", clubId],
    enabled,
    queryFn: async (): Promise<AdminTeam[]> => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, category")
        .eq("club_id", clubId!)
        .order("is_primary", { ascending: false })
        .order("display_order")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const memberships = useQuery({
    queryKey: ["club-memberships-all", clubId],
    enabled,
    queryFn: async (): Promise<MembershipLite[]> => {
      const { data, error } = await supabase
        .from("team_memberships")
        .select("id, user_id, team_id, role_id, job_title, role:roles!inner(id, name, club_id), team:teams(id, name)")
        .eq("role.club_id", clubId!);
      if (error) throw error;
      return (data ?? []).map((m: any) => ({
        id: m.id,
        user_id: m.user_id,
        team_id: m.team_id,
        role_id: m.role_id,
        job_title: m.job_title,
        roleName: m.role?.name ?? null,
        teamName: m.team?.name ?? null,
      }));
    },
  });

  const lastSignIn = useQuery({
    queryKey: ["adm-last-signin", clubId],
    enabled,
    staleTime: 60_000,
    queryFn: async () => {
      try {
        return await lastSignInFn();
      } catch {
        return { ok: false as const, items: [] };
      }
    },
  });

  const allCats = useQuery({
    queryKey: ["adm-all-cats", clubId],
    enabled,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await (supabase as any).from("member_all_categories").select("user_id");
      if (error) return new Set();
      return new Set((data ?? []).map((r: any) => r.user_id as string));
    },
  });

  const byUser = React.useMemo(() => {
    const map = new Map<string, MembershipLite[]>();
    for (const m of memberships.data ?? []) {
      const list = map.get(m.user_id) ?? [];
      list.push(m);
      map.set(m.user_id, list);
    }
    return map;
  }, [memberships.data]);

  const signInMap = React.useMemo(() => {
    const map = new Map<string, string | null>();
    for (const i of lastSignIn.data?.items ?? []) map.set(i.id, i.last_sign_in_at);
    return map;
  }, [lastSignIn.data]);

  return { members, roles, teams, memberships, lastSignIn, allCats, byUser, signInMap, signInAvailable: !!lastSignIn.data?.ok };
}

export function useRefreshAdminUsers(clubId: string | null | undefined) {
  const qc = useQueryClient();
  return React.useCallback(() => {
    for (const k of ["adm-members", "adm-roles", "club-memberships-all", "club-members", "adm-last-signin", "adm-all-cats", "club-roles", "club-role-permissions", "adm-audit"]) {
      qc.invalidateQueries({ queryKey: [k, clubId] });
    }
    qc.invalidateQueries({ queryKey: ["squad-access"] });
    qc.invalidateQueries({ queryKey: ["roster"] });
    qc.invalidateQueries({ queryKey: ["players"] });
    qc.invalidateQueries({ queryKey: ["member-all-categories"] });
  }, [qc, clubId]);
}

/** "Nunca ha entrado": sin último ingreso real (si lo hay) o con contraseña temporal pendiente. */
export function neverSignedIn(m: AdminMember, signInMap: Map<string, string | null>, available: boolean) {
  if (available && signInMap.has(m.id)) return !signInMap.get(m.id) || !!m.must_change_password;
  return !!m.must_change_password;
}

export function isPlayerMembership(roleName: string | null) {
  return inferBaseRole(roleName) === "jugador";
}

export function shortName(m: Pick<AdminMember, "first_name" | "paternal_last_name" | "full_name" | "email">) {
  const s = [m.first_name, m.paternal_last_name].map((x) => (x ?? "").trim()).filter(Boolean).join(" ");
  return s || m.full_name || m.email || "Sin nombre";
}

export function categoriesLine(mems: MembershipLite[], allCats: boolean) {
  if (mems.length === 0) return "Sin categoría";
  if (allCats) {
    const roles = Array.from(new Set(mems.map((m) => m.roleName).filter(Boolean)));
    return `Todas · ${roles.join(" · ")}`;
  }
  return mems.map((m) => `${m.teamName ?? "Todo el club"} · ${m.roleName ?? "—"}`).join(" · ");
}

export function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "hace un momento";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  if (d === 1) return "ayer";
  if (d < 30) return `hace ${d} días`;
  const mo = Math.round(d / 30);
  return mo < 12 ? `hace ${mo} meses` : `hace ${Math.round(mo / 12)} años`;
}

export function generateTempPassword(len = 12) {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const nums = "23456789";
  const all = upper + lower + nums;
  const rnd = (n: number) => {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0]! % n;
  };
  const chars = [upper[rnd(upper.length)]!, lower[rnd(lower.length)]!, nums[rnd(nums.length)]!];
  while (chars.length < len) chars.push(all[rnd(all.length)]!);
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rnd(i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }
  return chars.join("");
}
