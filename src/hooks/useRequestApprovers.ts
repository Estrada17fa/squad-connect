import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { REQUEST_TYPES, approverModuleFor, type RequestType } from "@/lib/requestTypes";
import { canEdit, type PermissionLevel } from "@/lib/permissions";
import type { ModuleKey } from "@/lib/modules";



/**
 * Modelo de aprobadores de solicitudes.
 *
 * 1. El ROL define, por default, qué tipos aprueba (tabla role_request_approvals).
 * 2. Cada persona puede ajustarse individualmente con un override 'grant' o
 *    'revoke' (tabla request_type_user_overrides).
 * 3. El override siempre gana sobre el rol; 'revoke' gana sobre 'grant'.
 * 4. Nadie aprueba su propia solicitud (regla forzada además en el servidor).
 *
 * Esta lógica es el espejo exacto de public.can_approve_request_type y
 * public.request_type_approver_ids.
 */

const db = supabase as any;

export type OverrideMode = "grant" | "revoke";

export interface RoleApprovalRow {
  role_id: string;
  request_type: RequestType;
}

export interface OverrideRow {
  id: string;
  club_id: string;
  user_id: string;
  request_type: RequestType;
  mode: OverrideMode;
}

export const ALL_REQUEST_TYPES: RequestType[] = REQUEST_TYPES.map((t) => t.key);

/* ------------------------------------------------------------------ */
/* Aprobaciones por rol                                                */
/* ------------------------------------------------------------------ */

export function useRoleApprovals(clubId: string | null) {
  return useQuery({
    queryKey: ["role-request-approvals", clubId],
    enabled: !!clubId,
    queryFn: async (): Promise<RoleApprovalRow[]> => {
      const { data: roles, error: rolesErr } = await db
        .from("roles")
        .select("id")
        .eq("club_id", clubId);
      if (rolesErr) throw rolesErr;
      const ids = (roles ?? []).map((r: any) => r.id);
      if (ids.length === 0) return [];
      const { data, error } = await db
        .from("role_request_approvals")
        .select("role_id, request_type")
        .in("role_id", ids);
      if (error) throw error;
      return (data ?? []) as RoleApprovalRow[];
    },
  });
}

/** Guarda la lista completa de tipos que aprueba un rol. */
export function useSaveRoleApprovals(clubId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ roleId, types }: { roleId: string; types: RequestType[] }) => {
      const { error: delErr } = await db
        .from("role_request_approvals")
        .delete()
        .eq("role_id", roleId);
      if (delErr) throw delErr;
      if (types.length > 0) {
        const { error } = await db
          .from("role_request_approvals")
          .insert(types.map((t) => ({ role_id: roleId, request_type: t })));
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["role-request-approvals", clubId] });
      qc.invalidateQueries({ queryKey: ["approver-overrides", clubId] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Overrides individuales                                              */
/* ------------------------------------------------------------------ */

export function useApproverOverrides(clubId: string | null) {
  return useQuery({
    queryKey: ["approver-overrides", clubId],
    enabled: !!clubId,
    queryFn: async (): Promise<OverrideRow[]> => {
      const { data, error } = await db
        .from("request_type_user_overrides")
        .select("id, club_id, user_id, request_type, mode")
        .eq("club_id", clubId);
      if (error) throw error;
      return (data ?? []) as OverrideRow[];
    },
  });
}

export function useSetApproverOverride(clubId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      type,
      mode,
    }: {
      userId: string;
      type: RequestType;
      /** null elimina el override y devuelve el comportamiento por rol. */
      mode: OverrideMode | null;
    }) => {
      if (!clubId) throw new Error("Sin club");
      if (mode === null) {
        const { error } = await db
          .from("request_type_user_overrides")
          .delete()
          .eq("club_id", clubId)
          .eq("user_id", userId)
          .eq("request_type", type);
        if (error) throw error;
        return;
      }
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await db.from("request_type_user_overrides").upsert(
        {
          club_id: clubId,
          user_id: userId,
          request_type: type,
          mode,
          assigned_by: auth?.user?.id ?? null,
        },
        { onConflict: "club_id,request_type,user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["approver-overrides", clubId] });
      qc.invalidateQueries({ queryKey: ["request-type-approvers"] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Estado efectivo por persona                                         */
/* ------------------------------------------------------------------ */

export interface EffectiveApproval {
  type: RequestType;
  /** ¿Aprueba este tipo al final de la regla? */
  effective: boolean;
  /** ¿Su rol se lo daría? */
  byRole: boolean;
  /** Override manual aplicado, si existe. */
  override: OverrideMode | null;
}

/** Roles (ids) de todas las membresías del usuario dentro de su club. */
export function useUserRoleIds(userId: string | null) {
  return useQuery({
    queryKey: ["user-role-ids", userId],
    enabled: !!userId,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await db
        .from("team_memberships")
        .select("role_id")
        .eq("user_id", userId);
      if (error) throw error;
      return Array.from(new Set((data ?? []).map((r: any) => r.role_id as string)));
    },
  });
}

export function computeEffective(
  roleIds: string[],
  roleApprovals: RoleApprovalRow[],
  overrides: OverrideRow[],
  userId: string,
): EffectiveApproval[] {
  const roleSet = new Set(roleIds);
  const byRoleTypes = new Set(
    roleApprovals.filter((r) => roleSet.has(r.role_id)).map((r) => r.request_type),
  );
  const mine = new Map(
    overrides.filter((o) => o.user_id === userId).map((o) => [o.request_type, o.mode]),
  );
  return ALL_REQUEST_TYPES.map((type) => {
    const byRole = byRoleTypes.has(type);
    const override = (mine.get(type) as OverrideMode | undefined) ?? null;
    const effective = override === "revoke" ? false : override === "grant" ? true : byRole;
    return { type, byRole, override, effective };
  });
}

/** Estado efectivo de aprobación de un miembro concreto. */
export function useMemberApprovals(clubId: string | null, userId: string | null) {
  const rolesQ = useUserRoleIds(userId);
  const approvalsQ = useRoleApprovals(clubId);
  const overridesQ = useApproverOverrides(clubId);

  const rows = React.useMemo<EffectiveApproval[]>(() => {
    if (!userId) return [];
    return computeEffective(
      rolesQ.data ?? [],
      approvalsQ.data ?? [],
      overridesQ.data ?? [],
      userId,
    );
  }, [rolesQ.data, approvalsQ.data, overridesQ.data, userId]);

  return {
    rows,
    isLoading: rolesQ.isLoading || approvalsQ.isLoading || overridesQ.isLoading,
  };
}

/**
 * Tipos que el usuario actual puede aprobar (misma regla que el servidor):
 * ser EDITOR del módulo correspondiente al tipo (medica→salud,
 * material→inventario, compra/pago/reembolso→compras_facturas, resto→
 * coordinacion_interna) Y estar designado como aprobador por rol/override.
 */
export function useMyApproverTypes(
  clubId: string | null,
  userId: string | null,
  isSuperAdmin: boolean,
  getModuleAccess?: (key: ModuleKey) => PermissionLevel,
) {
  const { rows } = useMemberApprovals(clubId, userId);
  return React.useMemo(() => {
    if (isSuperAdmin) return new Set<RequestType>(ALL_REQUEST_TYPES);
    return new Set<RequestType>(
      rows
        .filter((r) => r.effective)
        .filter((r) =>
          getModuleAccess ? canEdit(getModuleAccess(approverModuleFor(r.type))) : true,
        )
        .map((r) => r.type),
    );
  }, [rows, isSuperAdmin, getModuleAccess]);
}


/* ------------------------------------------------------------------ */
/* Lista efectiva de aprobadores por tipo (fuente: servidor)           */
/* ------------------------------------------------------------------ */

export interface ApproverPerson {
  id: string;
  name: string;
}

export function useRequestTypeApprovers(clubId: string | null, type: RequestType | null) {
  return useQuery({
    queryKey: ["request-type-approvers", clubId, type],
    enabled: !!clubId && !!type,
    queryFn: async (): Promise<ApproverPerson[]> => {
      const { data, error } = await db.rpc("request_type_approver_ids", {
        _club_id: clubId,
        _type: type,
      });
      if (error) throw error;
      const ids = (data ?? [])
        .map((r: any) => (typeof r === "string" ? r : r.user_id))
        .filter(Boolean) as string[];
      if (ids.length === 0) return [];
      const { data: profs, error: pErr } = await db
        .from("profiles")
        .select("id, full_name, first_name, paternal_last_name, email")
        .in("id", ids);
      if (pErr) throw pErr;
      return (profs ?? []).map((p: any) => ({
        id: p.id,
        name:
          [p.first_name, p.paternal_last_name].filter(Boolean).join(" ") ||
          p.full_name ||
          p.email ||
          "Sin nombre",
      }));
    },
  });
}
