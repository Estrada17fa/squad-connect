import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Módulo Desarrollo — seguimiento del progreso del jugador.
 *
 * Privacidad: la garantiza RLS. Un lector solo recibe SUS propias filas
 * (player_user_id = auth.uid()); ver a todo el equipo exige nivel editor en
 * 'desarrollo' para ese equipo. El cliente nunca filtra por permiso: si el
 * servidor no devuelve la fila, no existe para quien pregunta.
 */

const db = supabase as any;

export type GoalStatus = "pendiente" | "en_progreso" | "cumplido" | "no_cumplido";
export type AssignmentStatus = "asignada" | "en_progreso" | "completada";

export interface PlayerRef {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface FeedbackRow {
  id: string;
  club_id: string;
  team_id: string;
  player_user_id: string;
  feedback_date: string;
  context: string | null;
  content: string;
  /** Nota interna: si es false el jugador NUNCA la recibe (filtrado en RLS). */
  visible_to_player: boolean;
  created_by: string | null;
  created_at: string;
  player?: PlayerRef | null;
  team?: { id: string; name: string } | null;
}

export interface GoalRow {
  id: string;
  club_id: string;
  team_id: string;
  player_user_id: string;
  title: string;
  description: string | null;
  target_date: string | null;
  status: GoalStatus;
  completed_at: string | null;
  created_at: string;
  player?: PlayerRef | null;
  team?: { id: string; name: string } | null;
}

export interface ScoreRow {
  id: string;
  assessment_id: string;
  attribute: string;
  score: number;
}

export interface AssessmentRow {
  id: string;
  club_id: string;
  team_id: string;
  player_user_id: string;
  assessment_date: string;
  notes: string | null;
  created_at: string;
  player?: PlayerRef | null;
  team?: { id: string; name: string } | null;
  scores?: ScoreRow[];
}

export interface ExerciseRow {
  id: string;
  routine_id: string;
  name: string;
  sets: number | null;
  reps: string | null;
  instructions: string | null;
  order_index: number;
}

export interface AssignmentRow {
  id: string;
  routine_id: string;
  player_user_id: string;
  assigned_at: string;
  due_date: string | null;
  status: AssignmentStatus;
  notes: string | null;
  player?: PlayerRef | null;
  routine?: RoutineRow | null;
}

export interface RoutineRow {
  id: string;
  club_id: string;
  team_id: string;
  name: string;
  description: string | null;
  category: string | null;
  created_at: string;
  team?: { id: string; name: string } | null;
  exercises?: ExerciseRow[];
  assignments?: AssignmentRow[];
}

const PLAYER_FK = "player:profiles!%FK%(id, full_name, email, avatar_url)";
const FEEDBACK_SELECT = `id, club_id, team_id, player_user_id, feedback_date, context, content, visible_to_player, created_by, created_at, ${PLAYER_FK.replace("%FK%", "development_feedback_player_user_id_fkey")}, team:teams(id, name)`;
const GOAL_SELECT = `id, club_id, team_id, player_user_id, title, description, target_date, status, completed_at, created_at, ${PLAYER_FK.replace("%FK%", "development_goals_player_user_id_fkey")}, team:teams(id, name)`;
const ASSESSMENT_SELECT = `id, club_id, team_id, player_user_id, assessment_date, notes, created_at, ${PLAYER_FK.replace("%FK%", "development_assessments_player_user_id_fkey")}, team:teams(id, name), scores:assessment_scores(id, assessment_id, attribute, score)`;
const ROUTINE_SELECT = `id, club_id, team_id, name, description, category, created_at, team:teams(id, name), exercises:routine_exercises(id, routine_id, name, sets, reps, instructions, order_index), assignments:routine_assignments(id, routine_id, player_user_id, assigned_at, due_date, status, notes, ${PLAYER_FK.replace("%FK%", "routine_assignments_player_user_id_fkey")})`;

/** Atributos sugeridos para las evaluaciones. */
export const DEFAULT_ATTRIBUTES = ["Técnica", "Físico", "Táctica", "Actitud"];

export const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  cumplido: "Cumplido",
  no_cumplido: "No cumplido",
};

export const ASSIGNMENT_STATUS_LABEL: Record<AssignmentStatus, string> = {
  asignada: "Asignada",
  en_progreso: "En progreso",
  completada: "Completada",
};

/** Días hasta una fecha meta (negativo = vencida). */
export function daysUntil(date: string | null | undefined): number | null {
  if (!date) return null;
  const target = new Date(`${date}T12:00:00`);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export function formatDay(date: string | null | undefined): string {
  if (!date) return "—";
  return new Date(`${date}T12:00:00`).toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function useRealtime(clubId: string | null | undefined, table: string, key: string) {
  const qc = useQueryClient();
  React.useEffect(() => {
    if (!clubId) return;
    const ch = supabase
      .channel(`dev-${table}-${clubId}`)
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

export function useFeedback(clubId: string | null | undefined) {
  useRealtime(clubId, "development_feedback", "dev-feedback");
  return useQuery({
    queryKey: ["dev-feedback", clubId ?? "none"] as const,
    enabled: !!clubId,
    staleTime: 30_000,
    queryFn: async (): Promise<FeedbackRow[]> => {
      const { data, error } = await db
        .from("development_feedback")
        .select(FEEDBACK_SELECT)
        .eq("club_id", clubId)
        .order("feedback_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FeedbackRow[];
    },
  });
}

export function useGoals(clubId: string | null | undefined) {
  useRealtime(clubId, "development_goals", "dev-goals");
  return useQuery({
    queryKey: ["dev-goals", clubId ?? "none"] as const,
    enabled: !!clubId,
    staleTime: 30_000,
    queryFn: async (): Promise<GoalRow[]> => {
      const { data, error } = await db
        .from("development_goals")
        .select(GOAL_SELECT)
        .eq("club_id", clubId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GoalRow[];
    },
  });
}

export function useAssessments(clubId: string | null | undefined) {
  useRealtime(clubId, "development_assessments", "dev-assessments");
  return useQuery({
    queryKey: ["dev-assessments", clubId ?? "none"] as const,
    enabled: !!clubId,
    staleTime: 30_000,
    queryFn: async (): Promise<AssessmentRow[]> => {
      const { data, error } = await db
        .from("development_assessments")
        .select(ASSESSMENT_SELECT)
        .eq("club_id", clubId)
        .order("assessment_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as AssessmentRow[];
    },
  });
}

export function useRoutines(clubId: string | null | undefined) {
  useRealtime(clubId, "routine_assignments", "dev-routines");
  return useQuery({
    queryKey: ["dev-routines", clubId ?? "none"] as const,
    enabled: !!clubId,
    staleTime: 30_000,
    queryFn: async (): Promise<RoutineRow[]> => {
      const { data, error } = await db
        .from("training_routines")
        .select(ROUTINE_SELECT)
        .eq("club_id", clubId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as RoutineRow[]).map((r) => ({
        ...r,
        exercises: (r.exercises ?? []).slice().sort((a, b) => a.order_index - b.order_index),
      }));
    },
  });
}

/** Panorama completo de un jugador (para su ficha o para él mismo). */
export function usePlayerDevelopment(playerUserId: string | null | undefined) {
  return useQuery({
    queryKey: ["player-development", playerUserId ?? "none"] as const,
    enabled: !!playerUserId,
    staleTime: 15_000,
    queryFn: async () => {
      const [fbRes, goalRes, assessRes, assignRes, measureRes, statsRes] = await Promise.all([
        db
          .from("development_feedback")
          .select(FEEDBACK_SELECT)
          .eq("player_user_id", playerUserId)
          .order("feedback_date", { ascending: false }),
        db
          .from("development_goals")
          .select(GOAL_SELECT)
          .eq("player_user_id", playerUserId)
          .order("created_at", { ascending: false }),
        db
          .from("development_assessments")
          .select(ASSESSMENT_SELECT)
          .eq("player_user_id", playerUserId)
          .order("assessment_date", { ascending: true }),
        db
          .from("routine_assignments")
          .select(
            `id, routine_id, player_user_id, assigned_at, due_date, status, notes, routine:training_routines(id, club_id, team_id, name, description, category, created_at, exercises:routine_exercises(id, routine_id, name, sets, reps, instructions, order_index))`,
          )
          .eq("player_user_id", playerUserId)
          .order("assigned_at", { ascending: false }),
        db
          .from("development_measurements")
          .select(MEASUREMENT_SELECT)
          .eq("player_user_id", playerUserId)
          .order("measured_on", { ascending: false }),
        db
          .from("player_competition_stats")
          .select(STATS_SELECT)
          .eq("player_user_id", playerUserId)
          .order("season_name", { ascending: false }),
      ]);
      if (fbRes.error) throw fbRes.error;
      return {
        feedback: (fbRes.data ?? []) as FeedbackRow[],
        goals: (goalRes.data ?? []) as GoalRow[],
        assessments: (assessRes.data ?? []) as AssessmentRow[],
        measurements: (measureRes.data ?? []) as MeasurementRow[],
        stats: (statsRes.data ?? []) as CompetitionStatsRow[],
        assignments: ((assignRes.data ?? []) as AssignmentRow[]).map((a) => ({
          ...a,
          routine: a.routine
            ? {
                ...a.routine,
                exercises: (a.routine.exercises ?? []).slice().sort((x, y) => x.order_index - y.order_index),
              }
            : null,
        })),
      };
    },
  });
}

/** Jugadores de los equipos del club (para el resumen del cuerpo técnico). */
export function useDevelopmentRoster(clubId: string | null | undefined) {
  return useQuery({
    queryKey: ["development-roster", clubId ?? "none"] as const,
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

export type DevelopmentRosterMember = NonNullable<ReturnType<typeof useDevelopmentRoster>["data"]>[number];

/* ------------------------------------------------------------------ */
/* Mutaciones                                                          */
/* ------------------------------------------------------------------ */

function invalidateDev(qc: ReturnType<typeof useQueryClient>, clubId: string, playerUserId?: string) {
  qc.invalidateQueries({ queryKey: ["dev-feedback", clubId] });
  qc.invalidateQueries({ queryKey: ["dev-goals", clubId] });
  qc.invalidateQueries({ queryKey: ["dev-assessments", clubId] });
  qc.invalidateQueries({ queryKey: ["dev-routines", clubId] });
  if (playerUserId) qc.invalidateQueries({ queryKey: ["player-development", playerUserId] });
}

export function useSaveFeedback(clubId: string, userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string | null;
      team_id: string;
      player_user_id: string;
      feedback_date: string;
      context: string | null;
      content: string;
      visible_to_player: boolean;
    }) => {
      const { id, ...row } = input;
      if (id) {
        const { error } = await db.from("development_feedback").update(row).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await db
          .from("development_feedback")
          .insert({ ...row, club_id: clubId, created_by: userId });
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => invalidateDev(qc, clubId, vars.player_user_id),
  });
}

export function useDeleteFeedback(clubId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("development_feedback").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateDev(qc, clubId),
  });
}

export function useSaveGoal(clubId: string, userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string | null;
      team_id: string;
      player_user_id: string;
      title: string;
      description: string | null;
      target_date: string | null;
      status: GoalStatus;
    }) => {
      const { id, ...row } = input;
      if (id) {
        const { error } = await db.from("development_goals").update(row).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await db
          .from("development_goals")
          .insert({ ...row, club_id: clubId, created_by: userId });
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => invalidateDev(qc, clubId, vars.player_user_id),
  });
}

export function useSetGoalStatus(clubId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: GoalStatus; player_user_id?: string }) => {
      const { error } = await db
        .from("development_goals")
        .update({ status: input.status })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => invalidateDev(qc, clubId, vars.player_user_id),
  });
}

export function useDeleteGoal(clubId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("development_goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateDev(qc, clubId),
  });
}

export interface ScoreDraft {
  attribute: string;
  score: number;
}

export function useSaveAssessment(clubId: string, userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string | null;
      team_id: string;
      player_user_id: string;
      assessment_date: string;
      notes: string | null;
      scores: ScoreDraft[];
    }) => {
      const { id, scores, ...row } = input;
      let assessmentId = id ?? null;
      if (assessmentId) {
        const { error } = await db.from("development_assessments").update(row).eq("id", assessmentId);
        if (error) throw error;
        const { error: delErr } = await db
          .from("assessment_scores")
          .delete()
          .eq("assessment_id", assessmentId);
        if (delErr) throw delErr;
      } else {
        const { data, error } = await db
          .from("development_assessments")
          .insert({ ...row, club_id: clubId, created_by: userId })
          .select("id")
          .single();
        if (error) throw error;
        assessmentId = data.id as string;
      }
      const clean = scores.filter((s) => s.attribute.trim());
      if (clean.length > 0) {
        const { error } = await db.from("assessment_scores").insert(
          clean.map((s) => ({
            assessment_id: assessmentId,
            attribute: s.attribute.trim(),
            score: s.score,
          })),
        );
        if (error) throw error;
      }
      return assessmentId!;
    },
    onSuccess: (_d, vars) => invalidateDev(qc, clubId, vars.player_user_id),
  });
}

export function useDeleteAssessment(clubId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("development_assessments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateDev(qc, clubId),
  });
}

export interface ExerciseDraft {
  name: string;
  sets: string;
  reps: string;
  instructions: string;
}

export function useSaveRoutine(clubId: string, userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string | null;
      team_id: string;
      name: string;
      description: string | null;
      category: string | null;
      exercises: ExerciseDraft[];
    }) => {
      const { id, exercises, ...row } = input;
      let routineId = id ?? null;
      if (routineId) {
        const { error } = await db.from("training_routines").update(row).eq("id", routineId);
        if (error) throw error;
        const { error: delErr } = await db.from("routine_exercises").delete().eq("routine_id", routineId);
        if (delErr) throw delErr;
      } else {
        const { data, error } = await db
          .from("training_routines")
          .insert({ ...row, club_id: clubId, created_by: userId })
          .select("id")
          .single();
        if (error) throw error;
        routineId = data.id as string;
      }
      const clean = exercises.filter((e) => e.name.trim());
      if (clean.length > 0) {
        const { error } = await db.from("routine_exercises").insert(
          clean.map((e, idx) => ({
            routine_id: routineId,
            name: e.name.trim(),
            sets: e.sets.trim() ? Number(e.sets) : null,
            reps: e.reps.trim() || null,
            instructions: e.instructions.trim() || null,
            order_index: idx,
          })),
        );
        if (error) throw error;
      }
      return routineId!;
    },
    onSuccess: () => invalidateDev(qc, clubId),
  });
}

export function useDeleteRoutine(clubId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("training_routines").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateDev(qc, clubId),
  });
}

export function useAssignRoutine(clubId: string, userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { routine_id: string; player_user_ids: string[]; due_date: string | null }) => {
      if (input.player_user_ids.length === 0) return;
      const { error } = await db.from("routine_assignments").upsert(
        input.player_user_ids.map((pid) => ({
          routine_id: input.routine_id,
          player_user_id: pid,
          due_date: input.due_date,
          created_by: userId,
        })),
        { onConflict: "routine_id,player_user_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => invalidateDev(qc, clubId),
  });
}

export function useRemoveAssignment(clubId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("routine_assignments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidateDev(qc, clubId),
  });
}

/** El jugador puede mover el estado de SU rutina asignada (RLS lo permite). */
export function useSetAssignmentStatus(clubId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: AssignmentStatus; player_user_id?: string }) => {
      const { error } = await db
        .from("routine_assignments")
        .update({ status: input.status })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      if (clubId) invalidateDev(qc, clubId, vars.player_user_id);
      if (vars.player_user_id) {
        qc.invalidateQueries({ queryKey: ["player-development", vars.player_user_id] });
      }
    },
  });
}

/* ------------------------------------------------------------------ */
/* Utilidades de gráfica                                               */
/* ------------------------------------------------------------------ */

/** Serie por atributo a lo largo del tiempo, lista para recharts. */
export function assessmentSeries(assessments: AssessmentRow[]) {
  const ordered = assessments
    .slice()
    .sort((a, b) => a.assessment_date.localeCompare(b.assessment_date));
  const attributes = Array.from(
    new Set(ordered.flatMap((a) => (a.scores ?? []).map((s) => s.attribute))),
  );
  const rows = ordered.map((a) => {
    const row: Record<string, string | number> = {
      date: new Date(`${a.assessment_date}T12:00:00`).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "short",
      }),
    };
    for (const s of a.scores ?? []) row[s.attribute] = Number(s.score);
    return row;
  });
  const last = ordered[ordered.length - 1];
  const radar = (last?.scores ?? []).map((s) => ({
    attribute: s.attribute,
    score: Number(s.score),
  }));
  return { attributes, rows, radar, last };
}

export function averageScore(a: AssessmentRow | undefined | null): number | null {
  const scores = a?.scores ?? [];
  if (scores.length === 0) return null;
  return Math.round((scores.reduce((s, x) => s + Number(x.score), 0) / scores.length) * 10) / 10;
}
