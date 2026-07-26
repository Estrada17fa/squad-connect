import * as React from "react";
import { queryOptions, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TaskPriority = "baja" | "media" | "alta";
export type TaskStatus = "pendiente" | "en_progreso" | "completada";
export type AttendanceStatus = "invitado" | "confirmado" | "rechazado";

export interface AssigneeProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface TaskRow {
  id: string;
  club_id: string;
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
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  agenda: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  attendees: { user_id: string; attendance_status: AttendanceStatus; profile: AssigneeProfile }[];
}

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
        .select(
          "id, club_id, title, description, due_at, priority, status, created_by, completed_at, created_at, task_assignees(user_id, profile:profiles!task_assignees_user_id_profiles_fkey(id, full_name, email, avatar_url))",
        )
        .eq("club_id", clubId!)
        .order("due_at", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((t: any) => ({
        ...t,
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

export function useMeetings(clubId: string | null | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["coord-meetings", clubId ?? "none"],
    enabled: !!clubId,
    queryFn: async (): Promise<MeetingRow[]> => {
      const { data, error } = await supabase
        .from("meetings")
        .select(
          "id, club_id, title, starts_at, ends_at, location, agenda, notes, created_by, created_at, meeting_attendees(user_id, attendance_status, profile:profiles!meeting_attendees_user_id_profiles_fkey(id, full_name, email, avatar_url))",
        )
        .eq("club_id", clubId!)
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((m: any) => ({
        ...m,
        attendees: (m.meeting_attendees ?? []).map((a: any) => ({
          user_id: a.user_id,
          attendance_status: a.attendance_status,
          profile: a.profile,
        })),
      })) as MeetingRow[];
    },
  });

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
