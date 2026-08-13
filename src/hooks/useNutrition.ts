import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ISAK_FIELD_KEYS, MEAL_SLOT_ORDER, type FoodGroup, type MealSlot } from "@/lib/nutricion";

/**
 * Módulo Nutrición — planes semanales y antropometría (ISAK).
 *
 * Privacidad: la garantiza RLS ('nutricion', módulo personal). El jugador solo
 * recibe sus propias filas; el cliente nunca filtra por permiso.
 */

const db = supabase as any;

export interface PlayerRef {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface PortionRow {
  id: string;
  meal_id: string;
  plan_id: string;
  food_group: FoodGroup;
  portions: number;
  note: string | null;
}

export interface PlanMealRow {
  id: string;
  plan_id: string;
  slot: MealSlot;
  sort_order: number;
  notes: string | null;
  portions?: PortionRow[];
}

export interface MealPlanRow {
  id: string;
  club_id: string;
  team_id: string | null;
  player_user_id: string;
  week_start: string;
  week_end: string;
  week_type: string;
  notes: string | null;
  created_at: string;
  player?: PlayerRef | null;
  team?: { id: string; name: string } | null;
  meals?: PlanMealRow[];
}

export interface AssessmentRow {
  id: string;
  club_id: string;
  team_id: string | null;
  player_user_id: string;
  assessed_at: string;
  notes: string | null;
  created_at: string;
  player?: PlayerRef | null;
  team?: { id: string; name: string } | null;
  [key: string]: any;
}

const PLAN_SELECT = `id, club_id, team_id, player_user_id, week_start, week_end, week_type, notes, created_at,
  team:teams(id, name),
  meals:nutrition_plan_meals(id, plan_id, slot, sort_order, notes,
    portions:nutrition_plan_portions(id, meal_id, plan_id, food_group, portions, note))`;

const ASSESSMENT_SELECT = `id, club_id, team_id, player_user_id, assessed_at, notes, created_at, ${ISAK_FIELD_KEYS.join(", ")},
  team:teams(id, name)`;

function sortPlan(plan: MealPlanRow): MealPlanRow {
  return {
    ...plan,
    meals: (plan.meals ?? [])
      .slice()
      .sort((a, b) => MEAL_SLOT_ORDER.indexOf(a.slot) - MEAL_SLOT_ORDER.indexOf(b.slot)),
  };
}

function useRealtime(clubId: string | null | undefined, table: string, key: string) {
  const qc = useQueryClient();
  React.useEffect(() => {
    if (!clubId) return;
    const ch = supabase
      .channel(`nutri-${table}-${clubId}`)
      .on("postgres_changes", { event: "*", schema: "public", table }, () =>
        qc.invalidateQueries({ queryKey: [key, clubId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [clubId, qc, table, key]);
}

/* ------------------------------------------------------------------ */
/* Consultas                                                           */
/* ------------------------------------------------------------------ */

export function useMealPlans(clubId: string | null | undefined) {
  useRealtime(clubId, "nutrition_meal_plans", "nutri-plans");
  return useQuery({
    queryKey: ["nutri-plans", clubId ?? "none"] as const,
    enabled: !!clubId,
    staleTime: 30_000,
    queryFn: async (): Promise<MealPlanRow[]> => {
      const { data, error } = await db
        .from("nutrition_meal_plans")
        .select(PLAN_SELECT)
        .eq("club_id", clubId)
        .order("week_start", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as MealPlanRow[]).map(sortPlan);
    },
  });
}

export function useAnthroAssessments(clubId: string | null | undefined) {
  useRealtime(clubId, "nutrition_assessments", "nutri-assessments");
  return useQuery({
    queryKey: ["nutri-assessments", clubId ?? "none"] as const,
    enabled: !!clubId,
    staleTime: 30_000,
    queryFn: async (): Promise<AssessmentRow[]> => {
      const { data, error } = await db
        .from("nutrition_assessments")
        .select(ASSESSMENT_SELECT)
        .eq("club_id", clubId)
        .order("assessed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AssessmentRow[];
    },
  });
}

/** Panorama de un jugador: sus planes y sus estudios. */
export function usePlayerNutrition(playerUserId: string | null | undefined) {
  return useQuery({
    queryKey: ["player-nutrition", playerUserId ?? "none"] as const,
    enabled: !!playerUserId,
    staleTime: 15_000,
    queryFn: async () => {
      const [planRes, assessRes] = await Promise.all([
        db
          .from("nutrition_meal_plans")
          .select(PLAN_SELECT)
          .eq("player_user_id", playerUserId)
          .order("week_start", { ascending: false }),
        db
          .from("nutrition_assessments")
          .select(ASSESSMENT_SELECT)
          .eq("player_user_id", playerUserId)
          .order("assessed_at", { ascending: false }),
      ]);
      if (planRes.error) throw planRes.error;
      if (assessRes.error) throw assessRes.error;
      return {
        plans: ((planRes.data ?? []) as MealPlanRow[]).map(sortPlan),
        assessments: (assessRes.data ?? []) as AssessmentRow[],
      };
    },
  });
}

/**
 * Última medición de peso y talla por jugador — FUENTE ÚNICA para Plantel y
 * Desarrollo, que ya no capturan peso a mano.
 */
export function useLatestAnthropometry(clubId: string | null | undefined) {
  return useQuery({
    queryKey: ["nutri-latest-anthro", clubId ?? "none"] as const,
    enabled: !!clubId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await db
        .from("nutrition_assessments")
        .select("player_user_id, assessed_at, body_mass_kg, height_cm")
        .eq("club_id", clubId)
        .order("assessed_at", { ascending: false });
      if (error) throw error;
      const map = new Map<
        string,
        { assessedAt: string; weightKg: number | null; heightCm: number | null }
      >();
      for (const row of (data ?? []) as any[]) {
        if (map.has(row.player_user_id)) continue;
        map.set(row.player_user_id, {
          assessedAt: row.assessed_at,
          weightKg: row.body_mass_kg == null ? null : Number(row.body_mass_kg),
          heightCm: row.height_cm == null ? null : Number(row.height_cm),
        });
      }
      return map;
    },
  });
}

/** Jugadores de los equipos del club (panel de la nutrióloga). */
export function useNutritionRoster(clubId: string | null | undefined) {
  return useQuery({
    queryKey: ["nutrition-roster", clubId ?? "none"] as const,
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
          "id, user_id, team_id, position, jersey_number, profile:profiles(id, full_name, email, avatar_url)",
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
          position: (p.position ?? null) as string | null,
          jerseyNumber: (p.jersey_number ?? null) as number | null,
          fullName: (p.profile?.full_name ?? null) as string | null,
          avatarUrl: (p.profile?.avatar_url ?? null) as string | null,
        }))
        .sort((a, b) => (a.fullName ?? "").localeCompare(b.fullName ?? ""));
    },
  });
}

export type NutritionRosterMember = NonNullable<ReturnType<typeof useNutritionRoster>["data"]>[number];

/* ------------------------------------------------------------------ */
/* Mutaciones                                                          */
/* ------------------------------------------------------------------ */

function invalidate(qc: ReturnType<typeof useQueryClient>, clubId: string, playerUserId?: string) {
  qc.invalidateQueries({ queryKey: ["nutri-plans", clubId] });
  qc.invalidateQueries({ queryKey: ["nutri-assessments", clubId] });
  qc.invalidateQueries({ queryKey: ["nutri-latest-anthro", clubId] });
  if (playerUserId) qc.invalidateQueries({ queryKey: ["player-nutrition", playerUserId] });
}

export interface PlanDraftPortion {
  food_group: FoodGroup;
  portions: number;
  note: string | null;
}

export interface PlanDraftMeal {
  slot: MealSlot;
  notes: string | null;
  portions: PlanDraftPortion[];
}

export interface SavePlanInput {
  id?: string | null;
  team_id: string;
  player_user_id: string;
  week_start: string;
  week_end: string;
  week_type: string;
  notes: string | null;
  meals: PlanDraftMeal[];
}

export function useSaveMealPlan(clubId: string, userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SavePlanInput) => {
      const { id, meals, ...row } = input;
      let planId = id ?? null;
      if (planId) {
        const { error } = await db.from("nutrition_meal_plans").update(row).eq("id", planId);
        if (error) throw error;
        const { error: delErr } = await db.from("nutrition_plan_meals").delete().eq("plan_id", planId);
        if (delErr) throw delErr;
      } else {
        const { data, error } = await db
          .from("nutrition_meal_plans")
          .insert({ ...row, club_id: clubId, created_by: userId })
          .select("id")
          .single();
        if (error) throw error;
        planId = data.id as string;
      }

      const usable = meals.filter((m) => m.portions.length > 0 || (m.notes ?? "").trim());
      for (const [i, meal] of usable.entries()) {
        const { data: mealRow, error: mealErr } = await db
          .from("nutrition_plan_meals")
          .insert({ plan_id: planId, slot: meal.slot, sort_order: i, notes: meal.notes })
          .select("id")
          .single();
        if (mealErr) throw mealErr;
        if (meal.portions.length > 0) {
          const { error: pErr } = await db.from("nutrition_plan_portions").insert(
            meal.portions.map((p) => ({
              meal_id: mealRow.id,
              plan_id: planId,
              food_group: p.food_group,
              portions: p.portions,
              note: p.note,
            })),
          );
          if (pErr) throw pErr;
        }
      }
      return planId as string;
    },
    onSuccess: (_d, vars) => invalidate(qc, clubId, vars.player_user_id),
  });
}

export function useDeleteMealPlan(clubId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plan: MealPlanRow) => {
      const { error } = await db.from("nutrition_meal_plans").delete().eq("id", plan.id);
      if (error) throw error;
      return plan;
    },
    onSuccess: (plan) => invalidate(qc, clubId, plan.player_user_id),
  });
}

export interface SaveAssessmentInput {
  id?: string | null;
  team_id: string;
  player_user_id: string;
  assessed_at: string;
  notes: string | null;
  values: Record<string, number | null>;
}

export function useSaveAssessment(clubId: string, userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveAssessmentInput) => {
      const { id, values, ...rest } = input;
      const row = { ...rest, ...values };
      if (id) {
        const { error } = await db.from("nutrition_assessments").update(row).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await db
          .from("nutrition_assessments")
          .insert({ ...row, club_id: clubId, created_by: userId });
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => invalidate(qc, clubId, vars.player_user_id),
  });
}

export function useDeleteAssessment(clubId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: AssessmentRow) => {
      const { error } = await db.from("nutrition_assessments").delete().eq("id", a.id);
      if (error) throw error;
      return a;
    },
    onSuccess: (a) => invalidate(qc, clubId, a.player_user_id),
  });
}

/**
 * Peso y talla más recientes de UN jugador — lo usan Plantel y Desarrollo,
 * que ya no capturan peso: la fuente única es el estudio antropométrico.
 * Si el usuario no tiene acceso a 'nutricion', RLS devuelve vacío.
 */
export function usePlayerLatestAnthro(playerUserId: string | null | undefined) {
  return useQuery({
    queryKey: ["nutri-latest-anthro-player", playerUserId ?? "none"] as const,
    enabled: !!playerUserId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await db
        .from("nutrition_assessments")
        .select("assessed_at, body_mass_kg, height_cm")
        .eq("player_user_id", playerUserId)
        .order("assessed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        assessedAt: data.assessed_at as string,
        weightKg: data.body_mass_kg == null ? null : Number(data.body_mass_kg),
        heightCm: data.height_cm == null ? null : Number(data.height_cm),
      };
    },
  });
}
