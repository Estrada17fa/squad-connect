import * as React from "react";
import { queryOptions, useQuery, useQueryClient, useMutation, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TaskPriority = "baja" | "media" | "alta" | "urgente";
export type TaskStatus = "pendiente" | "en_progreso" | "en_pausa" | "completada";
export type MeetingStatus = "programada" | "en_curso" | "en_pausa" | "finalizada" | "cancelada";
export type AttendanceStatus = "invitado" | "confirmado" | "rechazado";

/** Grupos del tablero (estilo Monday). "en_pausa" vive dentro de "En progreso". */
export type TaskGroup = "por_hacer" | "en_progreso" | "hecha";

export const TASK_GROUPS: { key: TaskGroup; label: string; status: TaskStatus }[] = [
  { key: "por_hacer", label: "Por hacer", status: "pendiente" },
  { key: "en_progreso", label: "En progreso", status: "en_progreso" },
  { key: "hecha", label: "Hecha", status: "completada" },
];

export function groupOf(status: TaskStatus): TaskGroup {
  if (status === "completada") return "hecha";
  if (status === "pendiente") return "por_hacer";
  return "en_progreso";
}

export interface AssigneeProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface TeamRef {
  id: string;
  name: string;
  category: string | null;
}

export interface TaskRow {
  id: string;
  club_id: string;
  team_id: string | null;
  team: TeamRef | null;
  title: string;
  description: string | null;
  due_at: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  created_by: string | null;
  completed_at: string | null;
  created_at: string;
  assignees: AssigneeProfile[];
}

export interface MeetingRow {
  id: string;
  club_id: string;
  team_id: string | null;
  team: TeamRef | null;
  title: string;
  starts_at: string;
  ends_at: string | null;
  status: MeetingStatus;
  started_at: string | null;
  ended_at_actual: string | null;
  location: string | null;
  location_id: string | null;
  agenda: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  attendees: { user_id: string; attendance_status: AttendanceStatus; profile: AssigneeProfile }[];
}

export interface ChecklistItem {
  id: string;
  task_id: string;
  content: string;
  done: boolean;
  order_index: number;
}

const TASK_SELECT =
  "id, club_id, team_id, title, description, due_at, priority, status, created_by, completed_at, created_at, team:teams(id, name, category), task_assignees(user_id, profile:profiles!task_assignees_user_id_profiles_fkey(id, full_name, email, avatar_url))";

const MEETING_SELECT =
  "id, club_id, team_id, title, starts_at, ends_at, status, started_at, ended_at_actual, location, location_id, agenda, notes, created_by, created_at, team:teams(id, name, category), meeting_attendees(user_id, attendance_status, profile:profiles!meeting_attendees_user_id_profiles_fkey(id, full_name, email, avatar_url))";

export const tasksQueryOptions = (clubId: string | null | undefined) =>
  queryOptions({
    queryKey: ["coord-tasks", clubId ?? "none"] as const,
    enabled: !!clubId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<TaskRow[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select(TASK_SELECT)
        .eq("club_id", clubId!)
        .order("due_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((t: any) => ({
        ...t,
        team: t.team ?? null,
        assignees: (t.task_assignees ?? []).map((a: any) => a.profile).filter(Boolean),
      })) as TaskRow[];
    },
  });

export function useTasks(clubId: string | null | undefined) {
  const qc = useQueryClient();
  const query = useQuery(tasksQueryOptions(clubId));

  React.useEffect(() => {
    if (!clubId) return;
    const channel = supabase
      .channel(`coord-tasks-${clubId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `club_id=eq.${clubId}` }, () =>
        qc.invalidateQueries({ queryKey: ["coord-tasks", clubId] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "task_assignees" }, () =>
        qc.invalidateQueries({ queryKey: ["coord-tasks", clubId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [clubId, qc]);

  return query;
}

export const meetingsQueryOptions = (clubId: string | null | undefined) =>
  queryOptions({
    queryKey: ["coord-meetings", clubId ?? "none"] as const,
    enabled: !!clubId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<MeetingRow[]> => {
      const { data, error } = await supabase
        .from("meetings")
        .select(MEETING_SELECT)
        .eq("club_id", clubId!)
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((m: any) => ({
        ...m,
        team: m.team ?? null,
        attendees: (m.meeting_attendees ?? []).map((a: any) => ({
          user_id: a.user_id,
          attendance_status: a.attendance_status,
          profile: a.profile,
        })),
      })) as MeetingRow[];
    },
  });

export function useMeetings(clubId: string | null | undefined) {
  const qc = useQueryClient();
  const query = useQuery(meetingsQueryOptions(clubId));

  React.useEffect(() => {
    if (!clubId) return;
    const channel = supabase
      .channel(`coord-meetings-${clubId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "meetings", filter: `club_id=eq.${clubId}` }, () =>
        qc.invalidateQueries({ queryKey: ["coord-meetings", clubId] }),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "meeting_attendees" }, () =>
        qc.invalidateQueries({ queryKey: ["coord-meetings", clubId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [clubId, qc]);

  return query;
}

/* --------------------------------- Checklist -------------------------------- */

export function useChecklist(taskId: string | null | undefined) {
  return useQuery({
    queryKey: ["coord-checklist", taskId ?? "none"],
    enabled: !!taskId,
    queryFn: async (): Promise<ChecklistItem[]> => {
      const { data, error } = await supabase
        .from("task_checklist_items")
        .select("id, task_id, content, done, order_index")
        .eq("task_id", taskId!)
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChecklistItem[];
    },
  });
}

export function useChecklistMutations(taskId: string | null | undefined) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["coord-checklist", taskId ?? "none"] });

  const add = useMutation({
    mutationFn: async ({ content, order_index }: { content: string; order_index: number }) => {
      const { error } = await supabase
        .from("task_checklist_items")
        .insert({ task_id: taskId!, content, order_index });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const toggle = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase.from("task_checklist_items").update({ done }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("task_checklist_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { add, toggle, remove };
}

/** Staff members of the club (excludes users whose role is "Jugador"). */
export interface StaffMember {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  role_name: string | null;
}
export function useClubStaff(clubId: string | null | undefined) {
  return useQuery({
    queryKey: ["club-staff", clubId ?? "none"],
    enabled: !!clubId,
    queryFn: async (): Promise<StaffMember[]> => {
      const { data, error } = await supabase
        .from("team_memberships")
        .select(
          "user_id, profile:profiles!inner(id, full_name, email, avatar_url, club_id), role:roles!inner(name)",
        )
        .eq("profile.club_id", clubId!);
      if (error) throw error;
      const seen = new Set<string>();
      const out: StaffMember[] = [];
      for (const row of data ?? []) {
        const p: any = (row as any).profile;
        const roleName = (row as any).role?.name ?? null;
        if (!p || seen.has(p.id)) continue;
        if (roleName === "Jugador") continue;
        seen.add(p.id);
        out.push({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          avatar_url: p.avatar_url,
          role_name: roleName,
        });
      }
      return out.sort((a, b) => (a.full_name ?? "").localeCompare(b.full_name ?? ""));
    },
  });
}
