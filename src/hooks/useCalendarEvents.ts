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

export const calendarEventsQueryOptions = (teamId: string | null | undefined) =>
  queryOptions({
    queryKey: ["calendar-events", teamId ?? "none"] as const,
    enabled: !!teamId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<CalendarEventRow[]> => {
      const { data, error } = await supabase
        .from("calendar_events")
        .select("*")
        .or(`team_id.eq.${teamId},team_id.is.null`)
        .order("starts_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CalendarEventRow[];
    },
  });

export function useCalendarEvents(teamId: string | null | undefined) {
  const qc = useQueryClient();
  const query = useQuery(calendarEventsQueryOptions(teamId));

  React.useEffect(() => {
    if (!teamId) return;
    const channel = supabase
      .channel(`calendar-events-${teamId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calendar_events", filter: `team_id=eq.${teamId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["calendar-events", teamId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [teamId, qc]);

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
