import * as React from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { StatusVariant } from "@/components/squad/StatusBadge";

export type TripStatus = "planeacion" | "confirmado" | "en_curso" | "completado";

export const TRIP_STATUS_LABEL: Record<TripStatus, string> = {
  planeacion: "En planeación",
  confirmado: "Confirmado",
  en_curso: "En curso",
  completado: "Completado",
};

export const TRIP_STATUS_VARIANT: Record<TripStatus, StatusVariant> = {
  planeacion: "info",
  confirmado: "approved",
  en_curso: "pending",
  completado: "info",
};

export const TRIP_STATUS_ORDER: TripStatus[] = ["planeacion", "confirmado", "en_curso", "completado"];

export interface TripTraveler {
  id: string;
  trip_id: string;
  user_id: string;
  role_note: string | null;
  created_at: string;
  profile: {
    id: string;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

export interface TripRow {
  id: string;
  club_id: string;
  team_id: string;
  title: string;
  destination: string | null;
  match_event_id: string | null;
  departure_at: string;
  return_at: string | null;
  meeting_point: string | null;
  meeting_at: string | null;
  status: TripStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  match_event: { id: string; title: string; starts_at: string; location: string | null } | null;
  travelers: TripTraveler[];
}

const SELECT =
  "id, club_id, team_id, title, destination, match_event_id, departure_at, return_at, meeting_point, meeting_at, status, notes, created_by, created_at, updated_at, " +
  "match_event:calendar_events!trips_match_event_id_fkey(id, title, starts_at, location), " +
  "travelers:trip_travelers(id, trip_id, user_id, role_note, created_at, profile:profiles(id, full_name, email, avatar_url))";

export const tripsQueryOptions = (clubId: string | null | undefined, teamId: string | null | undefined) =>
  queryOptions({
    queryKey: ["trips", clubId ?? "none", teamId ?? "none"] as const,
    enabled: !!clubId && !!teamId,
    staleTime: 30_000,
    queryFn: async (): Promise<TripRow[]> => {
      const { data, error } = await supabase
        .from("trips")
        .select(SELECT)
        .eq("club_id", clubId!)
        .eq("team_id", teamId!)
        .order("departure_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TripRow[];
    },
  });

/** Lista de viajes del equipo activo, con realtime. */
export function useTrips(clubId: string | null | undefined, teamId: string | null | undefined) {
  const qc = useQueryClient();
  const query = useQuery(tripsQueryOptions(clubId, teamId));

  React.useEffect(() => {
    if (!clubId || !teamId) return;
    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ["trips", clubId, teamId] });
    };
    const channel = supabase
      .channel(`trips-${clubId}-${teamId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "trips", filter: `team_id=eq.${teamId}` }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "trip_travelers" }, invalidate)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [clubId, teamId, qc]);

  return query;
}

export interface TripInput {
  title: string;
  destination: string | null;
  match_event_id: string | null;
  departure_at: string;
  return_at: string | null;
  meeting_point: string | null;
  meeting_at: string | null;
  status: TripStatus;
  notes: string | null;
}

export async function createTrip(
  clubId: string,
  teamId: string,
  userId: string,
  input: TripInput,
): Promise<TripRow> {
  const { data, error } = await supabase
    .from("trips")
    .insert({ ...input, club_id: clubId, team_id: teamId, created_by: userId })
    .select("id")
    .single();
  if (error) throw error;
  return data as unknown as TripRow;
}

export async function updateTrip(tripId: string, input: Partial<TripInput>): Promise<void> {
  const { error } = await supabase.from("trips").update(input).eq("id", tripId);
  if (error) throw error;
}

export async function deleteTrip(tripId: string): Promise<void> {
  const { error } = await supabase.from("trips").delete().eq("id", tripId);
  if (error) throw error;
}

export async function addTraveler(tripId: string, userId: string, roleNote: string | null): Promise<void> {
  const { error } = await supabase
    .from("trip_travelers")
    .insert({ trip_id: tripId, user_id: userId, role_note: roleNote });
  if (error) throw error;
}

export async function removeTraveler(travelerId: string): Promise<void> {
  const { error } = await supabase.from("trip_travelers").delete().eq("id", travelerId);
  if (error) throw error;
}

/** Próximo viaje del equipo activo donde el usuario está convocado (tarjeta de Home). */
export function useMyNextTrip(
  clubId: string | null | undefined,
  teamId: string | null | undefined,
  userId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ["home-next-trip", teamId ?? "none", userId] as const,
    enabled: !!clubId && !!teamId && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trip_travelers")
        .select("trip:trips!inner(id, title, destination, departure_at, status, team_id, club_id)")
        .eq("user_id", userId);
      if (error) throw error;
      const nowIso = new Date().toISOString();
      const trips = (data ?? [])
        .map((r: any) => r.trip)
        .filter(
          (t: any) =>
            t && t.team_id === teamId && t.club_id === clubId && t.departure_at >= nowIso && t.status !== "completado",
        )
        .sort((a: any, b: any) => a.departure_at.localeCompare(b.departure_at));
      return (trips[0] ?? null) as
        | { id: string; title: string; destination: string | null; departure_at: string; status: TripStatus }
        | null;
    },
  });
}

/** Hitos cronológicos del viaje. En los próximos prompts se sumarán transporte, vuelos, hotel, comidas. */
export interface TripMilestone {
  id: string;
  at: string;
  label: string;
  detail?: string | null;
  kind: "citatorio" | "salida" | "regreso" | "partido";
}

export function tripMilestones(trip: TripRow): TripMilestone[] {
  const out: TripMilestone[] = [];
  if (trip.meeting_at) {
    out.push({
      id: "citatorio",
      at: trip.meeting_at,
      label: "Citatorio",
      detail: trip.meeting_point,
      kind: "citatorio",
    });
  }
  out.push({
    id: "salida",
    at: trip.departure_at,
    label: "Salida",
    detail: trip.destination ? `Destino: ${trip.destination}` : null,
    kind: "salida",
  });
  if (trip.match_event) {
    out.push({
      id: "partido",
      at: trip.match_event.starts_at,
      label: `Partido · ${trip.match_event.title}`,
      detail: trip.match_event.location,
      kind: "partido",
    });
  }
  if (trip.return_at) {
    out.push({ id: "regreso", at: trip.return_at, label: "Regreso", kind: "regreso" });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
}
