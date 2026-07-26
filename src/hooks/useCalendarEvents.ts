import * as React from "react";
import { queryOptions, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EventType } from "@/lib/eventTypes";

export interface CalendarEventRow {
  id: string;
  club_id: string;
  team_id: string;
  event_type: EventType;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  description: string | null;
  details: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
}

export interface CalendarScope {
  /** Cuando `mode` es 'team' se filtra por este team + eventos club-wide (team_id null). */
  teamId?: string | null;
  /** Cuando `mode` es 'club' se traen TODOS los eventos del club. */
  clubId?: string | null;
  mode: "team" | "club";
}

export const calendarEventsQueryOptions = (scope: CalendarScope) =>
  queryOptions({
    queryKey:
      scope.mode === "club"
        ? (["calendar-events", "club", scope.clubId ?? "none"] as const)
        : (["calendar-events", "team", scope.teamId ?? "none"] as const),
    enabled: scope.mode === "club" ? !!scope.clubId : !!scope.teamId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<CalendarEventRow[]> => {
      const q = supabase.from("calendar_events").select("*").order("starts_at", { ascending: true });
      if (scope.mode === "club") q.eq("club_id", scope.clubId!);
      else q.or(`team_id.eq.${scope.teamId},team_id.is.null`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as CalendarEventRow[];
    },
  });

export function useCalendarEvents(scope: CalendarScope) {
  const qc = useQueryClient();
  const query = useQuery(calendarEventsQueryOptions(scope));

  React.useEffect(() => {
    if (scope.mode === "club") {
      if (!scope.clubId) return;
      const channel = supabase
        .channel(`calendar-events-club-${scope.clubId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "calendar_events", filter: `club_id=eq.${scope.clubId}` },
          () => qc.invalidateQueries({ queryKey: ["calendar-events", "club", scope.clubId] }),
        )
        .subscribe();
      return () => {
        supabase.removeChannel(channel);
      };
    }
    if (!scope.teamId) return;
    const channel = supabase
      .channel(`calendar-events-team-${scope.teamId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calendar_events", filter: `team_id=eq.${scope.teamId}` },
        () => qc.invalidateQueries({ queryKey: ["calendar-events", "team", scope.teamId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [scope.mode, scope.teamId, scope.clubId, qc]);

  return query;
}

export function useEventAttendees(eventId: string | null | undefined) {
  return useQuery({
    queryKey: ["event-attendees", eventId ?? "none"],
    enabled: !!eventId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_attendees")
        .select("id, user_id, profile:profiles(id, full_name, email, avatar_url)")
        .eq("event_id", eventId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}
