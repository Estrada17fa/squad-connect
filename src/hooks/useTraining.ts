import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Módulo Entrenamientos — sesiones COLECTIVAS del equipo.
 *
 * No confundir con las rutinas de Desarrollo, que son individuales.
 * La privacidad y el alcance los garantiza RLS: un lector del módulo ve toda
 * la biblioteca y las sesiones de sus equipos; escribir exige nivel editor.
 */

const db = supabase as any;

export type ExerciseCategory =
  | "calentamiento"
  | "tecnica"
  | "tactica"
  | "fisico"
  | "portero"
  | "recuperacion"
  | "otro";

export type SessionPhase = "calentamiento" | "principal" | "vuelta_calma";

export const EXERCISE_CATEGORIES: { key: ExerciseCategory; label: string }[] = [
  { key: "calentamiento", label: "Calentamiento" },
  { key: "tecnica", label: "Técnica" },
  { key: "tactica", label: "Táctica" },
  { key: "fisico", label: "Físico" },
  { key: "portero", label: "Portero" },
  { key: "recuperacion", label: "Recuperación" },
  { key: "otro", label: "Otro" },
];

export const CATEGORY_LABEL: Record<ExerciseCategory, string> = Object.fromEntries(
  EXERCISE_CATEGORIES.map((c) => [c.key, c.label]),
) as Record<ExerciseCategory, string>;

export const PHASES: { key: SessionPhase; label: string }[] = [
  { key: "calentamiento", label: "Calentamiento" },
  { key: "principal", label: "Parte principal" },
  { key: "vuelta_calma", label: "Vuelta a la calma" },
];

export const PHASE_LABEL: Record<SessionPhase, string> = Object.fromEntries(
  PHASES.map((p) => [p.key, p.label]),
) as Record<SessionPhase, string>;

export interface ExerciseRow {
  id: string;
  club_id: string;
  team_id: string | null;
  name: string;
  description: string | null;
  objective: string | null;
  category: ExerciseCategory;
  duration_minutes: number | null;
  materials: string | null;
  media_path: string | null;
  created_by: string | null;
  created_at: string;
}

export interface TrainingSessionRow {
  id: string;
  club_id: string;
  team_id: string;
  event_id: string | null;
  title: string;
  objective: string | null;
  session_date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface SessionExerciseRow {
  id: string;
  session_id: string;
  exercise_id: string;
  phase: SessionPhase;
  order_index: number;
  custom_notes: string | null;
  duration_override: number | null;
  exercise?: ExerciseRow | null;
}

/* ============ biblioteca ============ */

export function useExercises(clubId: string | null) {
  return useQuery({
    queryKey: ["exercises", clubId ?? "none"],
    enabled: !!clubId,
    staleTime: 30_000,
    queryFn: async (): Promise<ExerciseRow[]> => {
      const { data, error } = await db
        .from("exercises")
        .select("*")
        .eq("club_id", clubId)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ExerciseRow[];
    },
  });
}

export function useSaveExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ExerciseRow> & { id?: string }) => {
      const { id, ...rest } = payload;
      if (id) {
        const { error } = await db.from("exercises").update(rest).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await db.from("exercises").insert(rest).select("id").single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exercises"] }),
  });
}

export function useDeleteExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { count, error: cErr } = await db
        .from("session_exercises")
        .select("id", { count: "exact", head: true })
        .eq("exercise_id", id);
      if (cErr) throw cErr;
      if ((count ?? 0) > 0) {
        throw new Error(`Este ejercicio se usa en ${count} sesión(es). Quítalo de ellas antes de eliminarlo.`);
      }
      const { error } = await db.from("exercises").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exercises"] }),
  });
}

/* ============ sesiones ============ */

export function useTrainingSessions(clubId: string | null) {
  return useQuery({
    queryKey: ["training-sessions", clubId ?? "none"],
    enabled: !!clubId,
    staleTime: 30_000,
    queryFn: async (): Promise<TrainingSessionRow[]> => {
      const { data, error } = await db
        .from("training_sessions")
        .select("*")
        .eq("club_id", clubId)
        .order("session_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TrainingSessionRow[];
    },
  });
}

/** Plan de una sesión: ejercicios de la biblioteca ordenados por fase. */
export function useSessionPlan(sessionId: string | null | undefined) {
  return useQuery({
    queryKey: ["session-plan", sessionId ?? "none"],
    enabled: !!sessionId,
    staleTime: 15_000,
    queryFn: async (): Promise<SessionExerciseRow[]> => {
      const { data, error } = await db
        .from("session_exercises")
        .select("*, exercise:exercises(*)")
        .eq("session_id", sessionId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SessionExerciseRow[];
    },
  });
}

/** Sesión ligada a un evento del calendario (para consultarla desde Agenda). */
export function useSessionByEvent(eventId: string | null | undefined) {
  return useQuery({
    queryKey: ["session-by-event", eventId ?? "none"],
    enabled: !!eventId,
    staleTime: 30_000,
    queryFn: async (): Promise<TrainingSessionRow | null> => {
      const { data, error } = await db
        .from("training_sessions")
        .select("*")
        .eq("event_id", eventId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as TrainingSessionRow | null;
    },
  });
}

export interface PlanDraftItem {
  exercise_id: string;
  phase: SessionPhase;
  custom_notes: string | null;
  duration_override: number | null;
}

export function useSaveSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      session: Partial<TrainingSessionRow>;
      plan: PlanDraftItem[];
    }) => {
      let sessionId = input.id;
      if (sessionId) {
        const { error } = await db.from("training_sessions").update(input.session).eq("id", sessionId);
        if (error) throw error;
        const { error: delErr } = await db.from("session_exercises").delete().eq("session_id", sessionId);
        if (delErr) throw delErr;
      } else {
        const { data, error } = await db
          .from("training_sessions")
          .insert(input.session)
          .select("id")
          .single();
        if (error) throw error;
        sessionId = data.id as string;
      }
      if (input.plan.length) {
        const rows = input.plan.map((p, i) => ({ ...p, session_id: sessionId, order_index: i }));
        const { error } = await db.from("session_exercises").insert(rows);
        if (error) throw error;
      }
      return sessionId!;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training-sessions"] });
      qc.invalidateQueries({ queryKey: ["session-plan"] });
      qc.invalidateQueries({ queryKey: ["session-by-event"] });
    },
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("training_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training-sessions"] });
      qc.invalidateQueries({ queryKey: ["session-by-event"] });
    },
  });
}

/** URL firmada para la media privada de un ejercicio. */
export function useExerciseMediaUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["exercise-media", path ?? "none"],
    enabled: !!path,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("exercise-media").createSignedUrl(path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export function formatSessionDate(iso: string) {
  return new Date(iso).toLocaleString("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
