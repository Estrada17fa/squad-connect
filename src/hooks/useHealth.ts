import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AvailabilityStatus } from "@/hooks/usePlayers";

/**
 * Módulo Salud — datos médicos.
 *
 * Privacidad: la visibilidad la garantiza RLS (can_access_health por equipo, o
 * ser el dueño de la fila). Estas consultas nunca filtran por permiso en el
 * cliente: si el servidor no devuelve la fila, no existe para quien pregunta.
 */

const db = supabase as any;

export type InjurySeverity = "leve" | "moderada" | "grave";
export type InjuryStatus = "activa" | "en_recuperacion" | "recuperada";

export interface MedicalProfileRow {
  id: string;
  club_id: string;
  team_id: string;
  player_user_id: string;
  blood_type: string | null;
  allergies: string | null;
  chronic_conditions: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
  updated_at: string;
}

export interface CheckupRow {
  id: string;
  club_id: string;
  team_id: string;
  player_user_id: string;
  checkup_date: string;
  checkup_type: CheckupType;
  reason: string;
  findings: string | null;
  diagnosis: string | null;
  notes: string | null;
  request_id: string | null;
  created_by: string | null;
  created_at: string;
  player?: { id: string; full_name: string | null; email: string | null; avatar_url: string | null } | null;
  team?: { id: string; name: string } | null;
  prescriptions?: PrescriptionRow[];
}

export interface PrescriptionRow {
  id: string;
  club_id: string;
  team_id: string;
  checkup_id: string | null;
  player_user_id: string;
  medication: string;
  dosage: string | null;
  duration: string | null;
  instructions: string | null;
  prescribed_at: string;
}

export interface InjuryRow {
  id: string;
  club_id: string;
  team_id: string;
  player_user_id: string;
  injury_type: string;
  body_part: string;
  severity: InjurySeverity;
  occurred_at: string;
  estimated_return: string | null;
  status: InjuryStatus;
  description: string | null;
  created_at: string;
  player?: { id: string; full_name: string | null; email: string | null; avatar_url: string | null } | null;
  team?: { id: string; name: string } | null;
}

export interface InjuryProgressRow {
  id: string;
  injury_id: string;
  note: string;
  progress_date: string;
  created_by: string | null;
}

const CHECKUP_SELECT =
  "id, club_id, team_id, player_user_id, checkup_date, reason, findings, diagnosis, notes, request_id, created_by, created_at, player:profiles!medical_checkups_player_user_id_fkey(id, full_name, email, avatar_url), team:teams(id, name)";
const INJURY_SELECT =
  "id, club_id, team_id, player_user_id, injury_type, body_part, severity, occurred_at, estimated_return, status, description, created_at, player:profiles!injuries_player_user_id_fkey(id, full_name, email, avatar_url), team:teams(id, name)";
const PRESCRIPTION_SELECT =
  "id, club_id, team_id, checkup_id, player_user_id, medication, dosage, duration, instructions, prescribed_at";

/* ------------------------------------------------------------------ */
/* Consultas                                                           */
/* ------------------------------------------------------------------ */

/** Revisiones visibles del club (RLS acota a equipos con acceso + las propias). */
export function useCheckups(clubId: string | null | undefined) {
  const qc = useQueryClient();
  React.useEffect(() => {
    if (!clubId) return;
    const ch = supabase
      .channel(`health-checkups-${clubId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "medical_checkups" }, () =>
        qc.invalidateQueries({ queryKey: ["checkups", clubId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [clubId, qc]);

  return useQuery({
    queryKey: ["checkups", clubId ?? "none"] as const,
    enabled: !!clubId,
    staleTime: 30_000,
    queryFn: async (): Promise<CheckupRow[]> => {
      const { data, error } = await db
        .from("medical_checkups")
        .select(CHECKUP_SELECT)
        .eq("club_id", clubId)
        .order("checkup_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CheckupRow[];
    },
  });
}

/** Lesiones visibles del club. */
export function useInjuries(clubId: string | null | undefined) {
  const qc = useQueryClient();
  React.useEffect(() => {
    if (!clubId) return;
    const ch = supabase
      .channel(`health-injuries-${clubId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "injuries" }, () =>
        qc.invalidateQueries({ queryKey: ["injuries", clubId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [clubId, qc]);

  return useQuery({
    queryKey: ["injuries", clubId ?? "none"] as const,
    enabled: !!clubId,
    staleTime: 30_000,
    queryFn: async (): Promise<InjuryRow[]> => {
      const { data, error } = await db
        .from("injuries")
        .select(INJURY_SELECT)
        .eq("club_id", clubId)
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InjuryRow[];
    },
  });
}

/** Recetas visibles del club. */
export function usePrescriptions(clubId: string | null | undefined) {
  return useQuery({
    queryKey: ["prescriptions", clubId ?? "none"] as const,
    enabled: !!clubId,
    staleTime: 30_000,
    queryFn: async (): Promise<PrescriptionRow[]> => {
      const { data, error } = await db
        .from("medical_prescriptions")
        .select(PRESCRIPTION_SELECT)
        .eq("club_id", clubId)
        .order("prescribed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PrescriptionRow[];
    },
  });
}

/** Expediente completo de un jugador (para su ficha o para él mismo). */
export function usePlayerHealth(playerUserId: string | null | undefined) {
  return useQuery({
    queryKey: ["player-health", playerUserId ?? "none"] as const,
    enabled: !!playerUserId,
    staleTime: 15_000,
    queryFn: async () => {
      const [profileRes, checkupsRes, prescRes, injuriesRes] = await Promise.all([
        db
          .from("player_medical_profile")
          .select("*")
          .eq("player_user_id", playerUserId)
          .maybeSingle(),
        db
          .from("medical_checkups")
          .select(CHECKUP_SELECT)
          .eq("player_user_id", playerUserId)
          .order("checkup_date", { ascending: false }),
        db
          .from("medical_prescriptions")
          .select(PRESCRIPTION_SELECT)
          .eq("player_user_id", playerUserId)
          .order("prescribed_at", { ascending: false }),
        db
          .from("injuries")
          .select(INJURY_SELECT)
          .eq("player_user_id", playerUserId)
          .order("occurred_at", { ascending: false }),
      ]);
      if (checkupsRes.error) throw checkupsRes.error;
      return {
        profile: (profileRes.data ?? null) as MedicalProfileRow | null,
        checkups: (checkupsRes.data ?? []) as CheckupRow[],
        prescriptions: (prescRes.data ?? []) as PrescriptionRow[],
        injuries: (injuriesRes.data ?? []) as InjuryRow[],
      };
    },
  });
}

export function useInjuryProgress(injuryId: string | null | undefined) {
  return useQuery({
    queryKey: ["injury-progress", injuryId ?? "none"] as const,
    enabled: !!injuryId,
    staleTime: 15_000,
    queryFn: async (): Promise<InjuryProgressRow[]> => {
      const { data, error } = await db
        .from("injury_progress")
        .select("id, injury_id, note, progress_date, created_by")
        .eq("injury_id", injuryId)
        .order("progress_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InjuryProgressRow[];
    },
  });
}

/** Revisión ligada a una solicitud médica (para no duplicarla). */
export function useRequestCheckup(requestId: string | null | undefined) {
  return useQuery({
    queryKey: ["request-checkup", requestId ?? "none"] as const,
    enabled: !!requestId,
    staleTime: 15_000,
    queryFn: async (): Promise<CheckupRow | null> => {
      const { data, error } = await db
        .from("medical_checkups")
        .select(CHECKUP_SELECT)
        .eq("request_id", requestId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as CheckupRow | null;
    },
  });
}

/** Jugadores del club (por equipo) para el plantel médico. */
export function useMedicalRoster(clubId: string | null | undefined) {
  return useQuery({
    queryKey: ["medical-roster", clubId ?? "none"] as const,
    enabled: !!clubId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data: teamRows, error: teamErr } = await supabase
        .from("teams")
        .select("id, name")
        .eq("club_id", clubId!);
      if (teamErr) throw teamErr;
      const teams = teamRows ?? [];
      if (teams.length === 0) return [];
      const { data, error } = await supabase
        .from("player_profiles")
        .select(
          "id, user_id, team_id, position, jersey_number, availability_status, profile:profiles(id, full_name, email, avatar_url)",
        )
        .in(
          "team_id",
          teams.map((t) => t.id),
        );
      if (error) throw error;
      const nameById = new Map(teams.map((t) => [t.id, t.name]));
      return (data ?? [])
        .map((p: any) => ({
          playerId: p.id as string,
          userId: p.user_id as string,
          teamId: p.team_id as string,
          teamName: nameById.get(p.team_id) ?? null,
          position: p.position as string | null,
          jerseyNumber: p.jersey_number as number | null,
          availability: (p.availability_status ?? "apto") as AvailabilityStatus,
          fullName: p.profile?.full_name ?? null,
          avatarUrl: p.profile?.avatar_url ?? null,
        }))
        .sort((a, b) => (a.fullName ?? "").localeCompare(b.fullName ?? ""));
    },
  });
}

export type MedicalRosterMember = NonNullable<ReturnType<typeof useMedicalRoster>["data"]>[number];

/* ------------------------------------------------------------------ */
/* Mutaciones                                                          */
/* ------------------------------------------------------------------ */

function invalidateHealth(qc: ReturnType<typeof useQueryClient>, clubId: string, playerUserId?: string) {
  qc.invalidateQueries({ queryKey: ["checkups", clubId] });
  qc.invalidateQueries({ queryKey: ["injuries", clubId] });
  qc.invalidateQueries({ queryKey: ["prescriptions", clubId] });
  qc.invalidateQueries({ queryKey: ["medical-roster", clubId] });
  if (playerUserId) qc.invalidateQueries({ queryKey: ["player-health", playerUserId] });
}

export function useSaveMedicalProfile(clubId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<MedicalProfileRow> & { player_user_id: string; team_id: string }) => {
      const { error } = await db
        .from("player_medical_profile")
        .upsert({ ...payload, club_id: clubId }, { onConflict: "player_user_id,team_id" });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => invalidateHealth(qc, clubId, vars.player_user_id),
  });
}

export interface PrescriptionDraft {
  medication: string;
  dosage: string;
  duration: string;
  instructions: string;
}

export function useSaveCheckup(clubId: string, userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string | null;
      team_id: string;
      player_user_id: string;
      checkup_date: string;
      reason: string;
      findings: string | null;
      diagnosis: string | null;
      notes: string | null;
      request_id?: string | null;
      prescriptions?: PrescriptionDraft[];
    }) => {
      const { id, prescriptions, ...row } = input;
      let checkupId = id ?? null;
      if (checkupId) {
        const { error } = await db.from("medical_checkups").update(row).eq("id", checkupId);
        if (error) throw error;
      } else {
        const { data, error } = await db
          .from("medical_checkups")
          .insert({ ...row, club_id: clubId, created_by: userId })
          .select("id")
          .single();
        if (error) throw error;
        checkupId = data.id as string;
      }

      const clean = (prescriptions ?? []).filter((p) => p.medication.trim());
      if (clean.length > 0) {
        const { error } = await db.from("medical_prescriptions").insert(
          clean.map((p) => ({
            club_id: clubId,
            team_id: row.team_id,
            checkup_id: checkupId,
            player_user_id: row.player_user_id,
            medication: p.medication.trim(),
            dosage: p.dosage.trim() || null,
            duration: p.duration.trim() || null,
            instructions: p.instructions.trim() || null,
            prescribed_by: userId,
          })),
        );
        if (error) throw error;
      }

      // Solicitud médica origen: queda ligada y pasa a completada.
      if (input.request_id && !id) {
        const { error } = await supabase
          .from("requests")
          .update({ status: "completada" as const })
          .eq("id", input.request_id);
        if (error) throw error;
      }
      return checkupId!;
    },
    onSuccess: (_d, vars) => {
      invalidateHealth(qc, clubId, vars.player_user_id);
      if (vars.request_id) {
        qc.invalidateQueries({ queryKey: ["request-checkup", vars.request_id] });
        qc.invalidateQueries({ queryKey: ["requests", clubId] });
        qc.invalidateQueries({ queryKey: ["request-history", vars.request_id] });
      }
    },
  });
}

export function useDeleteCheckup(clubId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("medical_checkups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateHealth(qc, clubId),
  });
}

export function useSaveInjury(clubId: string, userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string | null;
      team_id: string;
      player_user_id: string;
      injury_type: string;
      body_part: string;
      severity: InjurySeverity;
      occurred_at: string;
      estimated_return: string | null;
      status: InjuryStatus;
      description: string | null;
      availability?: AvailabilityStatus | null;
    }) => {
      const { id, availability, ...row } = input;
      if (id) {
        const { error } = await db.from("injuries").update(row).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await db.from("injuries").insert({ ...row, club_id: clubId, created_by: userId });
        if (error) throw error;
      }
      if (availability) {
        const { error } = await supabase
          .from("player_profiles")
          .update({ availability_status: availability })
          .eq("user_id", row.player_user_id)
          .eq("team_id", row.team_id);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      invalidateHealth(qc, clubId, vars.player_user_id);
      qc.invalidateQueries({ queryKey: ["roster"] });
      qc.invalidateQueries({ queryKey: ["players", vars.team_id] });
    },
  });
}

export function useDeleteInjury(clubId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("injuries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateHealth(qc, clubId),
  });
}

export function useAddInjuryProgress(clubId: string, userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { injury_id: string; note: string; progress_date: string }) => {
      const { error } = await db.from("injury_progress").insert({ ...input, created_by: userId });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["injury-progress", vars.injury_id] });
      invalidateHealth(qc, clubId);
    },
  });
}

/** Cambia la disponibilidad del jugador (se refleja en Plantel). */
export function useSetAvailability(clubId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { player_user_id: string; team_id: string; status: AvailabilityStatus }) => {
      const { error } = await supabase
        .from("player_profiles")
        .update({ availability_status: input.status })
        .eq("user_id", input.player_user_id)
        .eq("team_id", input.team_id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      invalidateHealth(qc, clubId, vars.player_user_id);
      qc.invalidateQueries({ queryKey: ["roster"] });
      qc.invalidateQueries({ queryKey: ["players", vars.team_id] });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

export const SEVERITY_LABEL: Record<InjurySeverity, string> = {
  leve: "Leve",
  moderada: "Moderada",
  grave: "Grave",
};

export const INJURY_STATUS_LABEL: Record<InjuryStatus, string> = {
  activa: "Activa",
  en_recuperacion: "En recuperación",
  recuperada: "Recuperada",
};

/** Días para el retorno estimado (negativo = vencido). null si no hay fecha. */
export function daysToReturn(injury: Pick<InjuryRow, "estimated_return">): number | null {
  if (!injury.estimated_return) return null;
  const target = new Date(`${injury.estimated_return}T12:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function isInjuryOpen(i: InjuryRow): boolean {
  return i.status !== "recuperada";
}
