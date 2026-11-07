import * as React from "react";
import { queryOptions, useQuery, useQueryClient, useInfiniteQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { EventType } from "@/lib/eventTypes";
import { isAgendaVisible, type StoredTripStatus } from "@/lib/viajes";

const EVENT_SELECT = "*, trip:trips!calendar_events_trip_id_fkey(status)";
const visible = (rows: unknown[] | null) => ((rows ?? []) as CalendarEventRow[]).filter(isAgendaVisible);

export interface CalendarEventRow {
  id: string;
  club_id: string;
  team_id: string;
  event_type: EventType;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  location_id?: string | null;
  description: string | null;
  details: Record<string, unknown> | null;
  /** Llaves de origen: el evento lo generó otro módulo. */
  meeting_id?: string | null;
  trip_id?: string | null;
  /** Estado del viaje ligado (null si no se puede leer). */
  trip?: { status: StoredTripStatus } | null;
  is_private?: boolean;
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
      const q = supabase.from("calendar_events").select(EVENT_SELECT).order("starts_at", { ascending: true });
      if (scope.mode === "club") q.eq("club_id", scope.clubId!);
      else q.or(`team_id.eq.${scope.teamId},team_id.is.null`);
      const { data, error } = await q;
      if (error) throw error;
      return visible(data);
    },
  });

export function useCalendarEvents(scope: CalendarScope) {
  const qc = useQueryClient();
  // Sufijo único: dos componentes pueden observar el mismo club/equipo a la vez.
  const uid = React.useId();
  const query = useQuery(calendarEventsQueryOptions(scope));

  React.useEffect(() => {
    if (scope.mode === "club") {
      if (!scope.clubId) return;
      const channel = supabase
        .channel(`calendar-events-club-${scope.clubId}-${uid}`)
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
      .channel(`calendar-events-team-${scope.teamId}-${uid}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "calendar_events", filter: `team_id=eq.${scope.teamId}` },
        () => qc.invalidateQueries({ queryKey: ["calendar-events", "team", scope.teamId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [scope.mode, scope.teamId, scope.clubId, qc, uid]);

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

/**
 * Próximos eventos del usuario, listos para Home/Inicio.
 *
 * La RLS de `calendar_events` ya limita las filas al permiso del módulo de
 * origen de cada evento (entrenamientos, juntas, partidos, viajes, salud),
 * así que aquí solo se acota la ventana de tiempo.
 */
export function useUpcomingEvents(clubId: string | null | undefined, limit = 5) {
  return useQuery({
    queryKey: ["calendar-events", "upcoming", clubId ?? "none", limit] as const,
    enabled: !!clubId,
    staleTime: 30_000,
    queryFn: async (): Promise<CalendarEventRow[]> => {
      const { data, error } = await supabase
        .from("calendar_events")
        .select(EVENT_SELECT)
        .eq("club_id", clubId!)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(limit + 10);
      if (error) throw error;
      return visible(data).slice(0, limit);
    },
  });
}

/** Próximo evento de un tipo concreto (próximo entrenamiento, partido, viaje…). */
export function useNextEventOfType(clubId: string | null | undefined, type: EventType) {
  return useQuery({
    queryKey: ["calendar-events", "next", clubId ?? "none", type] as const,
    enabled: !!clubId,
    staleTime: 30_000,
    queryFn: async (): Promise<CalendarEventRow | null> => {
      const { data, error } = await supabase
        .from("calendar_events")
        .select(EVENT_SELECT)
        .eq("club_id", clubId!)
        .eq("event_type", type)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(10);
      if (error) throw error;
      return visible(data)[0] ?? null;
    },
  });
}

/* ---------- Consultas por rango (Agenda) ---------- */

/** Eventos del club que tocan [from, to): empiezan dentro o siguen en curso. */
async function fetchRange(clubId: string, from: Date, to: Date): Promise<CalendarEventRow[]> {
  const f = from.toISOString();
  const { data, error } = await supabase
    .from("calendar_events")
    .select(EVENT_SELECT)
    .eq("club_id", clubId)
    .lt("starts_at", to.toISOString())
    .or(`starts_at.gte.${f},ends_at.gte.${f}`)
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return visible(data);
}

export const calendarRangeQueryOptions = (clubId: string | null, from: Date, to: Date) =>
  queryOptions({
    queryKey: ["calendar-events", "club", clubId ?? "none", "range", from.toISOString(), to.toISOString()] as const,
    enabled: !!clubId,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
    queryFn: () => fetchRange(clubId!, from, to),
  });

export function useCalendarRange(clubId: string | null, from: Date, to: Date) {
  return useQuery(calendarRangeQueryOptions(clubId, from, to));
}

/** Páginas mensuales: hacia adelante desde `anchor` o hacia atrás hasta `anchor`. */
export function useCalendarMonths(clubId: string | null, anchor: Date, dir: "forward" | "back", enabled = true) {
  return useInfiniteQuery({
    queryKey: ["calendar-events", "club", clubId ?? "none", "months", dir, anchor.toISOString()] as const,
    enabled: !!clubId && enabled,
    staleTime: 30_000,
    initialPageParam: 0,
    queryFn: ({ pageParam }) => {
      const n = pageParam as number;
      const m0 = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      if (dir === "forward") {
        const from = n === 0 ? anchor : new Date(m0.getFullYear(), m0.getMonth() + n, 1);
        return fetchRange(clubId!, from, new Date(m0.getFullYear(), m0.getMonth() + n + 1, 1)).then((rows) =>
          rows.filter((r) => new Date(r.starts_at) >= from || n === 0),
        );
      }
      const from = new Date(m0.getFullYear(), m0.getMonth() - n, 1);
      const to = n === 0 ? anchor : new Date(m0.getFullYear(), m0.getMonth() - n + 1, 1);
      return fetchRange(clubId!, from, to).then((rows) => rows.filter((r) => new Date(r.starts_at) >= from && new Date(r.starts_at) < to));
    },
    // Se detiene tras 12 meses seguidos sin eventos.
    getNextPageParam: (last, pages, lastParam) => {
      const tail = pages.slice(-12);
      return tail.length === 12 && tail.every((p) => p.length === 0) ? undefined : (lastParam as number) + 1;
    },
  });
}

/** Próximo evento visible a partir de `from` (para "Semana libre"). */
export function useNextEventAfter(clubId: string | null, from: Date, enabled: boolean) {
  return useQuery({
    queryKey: ["calendar-events", "club", clubId ?? "none", "next", from.toISOString()] as const,
    enabled: !!clubId && enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("calendar_events").select(EVENT_SELECT).eq("club_id", clubId!).gte("starts_at", from.toISOString()).order("starts_at").limit(20);
      if (error) throw error;
      return visible(data);
    },
  });
}

/** Avisos en vivo para todas las consultas por rango del club. */
export function useCalendarLive(clubId: string | null) {
  const qc = useQueryClient();
  const uid = React.useId();
  React.useEffect(() => {
    if (!clubId) return;
    const ch = supabase
      .channel(`calendar-range-${clubId}-${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "calendar_events", filter: `club_id=eq.${clubId}` }, () =>
        qc.invalidateQueries({ queryKey: ["calendar-events", "club", clubId] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clubId, qc, uid]);
}
