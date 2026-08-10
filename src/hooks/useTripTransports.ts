import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTripChannel, syncAssignments } from "./useTripChannel";
import { MINI_PROFILE_SELECT, type MiniProfile, type TripLeg, type TripTransportType } from "@/lib/tripLogistics";

export interface TripTransport {
  id: string;
  trip_id: string;
  leg: TripLeg;
  transport_type: TripTransportType;
  label: string | null;
  departs_at: string;
  pickup_location: string;
  pickup_location_id: string | null;
  destination: string;
  notes: string | null;
  passengers: { id: string; user_id: string; profile: MiniProfile | null }[];
}

export interface TransportInput {
  leg: TripLeg;
  transport_type: TripTransportType;
  label: string | null;
  departs_at: string;
  pickup_location: string;
  pickup_location_id: string | null;
  destination: string;
  notes: string | null;
}

const SELECT =
  `id, trip_id, leg, transport_type, label, departs_at, pickup_location, pickup_location_id, destination, notes, ` +
  `passengers:trip_transport_passengers(id, user_id, profile:profiles(${MINI_PROFILE_SELECT}))`;

export const tripTransportsKey = (tripId: string | null | undefined) =>
  ["trip-transports", tripId ?? "none"] as const;

export function useTripTransports(tripId: string | null | undefined) {
  const query = useQuery({
    queryKey: tripTransportsKey(tripId),
    enabled: !!tripId,
    queryFn: async (): Promise<TripTransport[]> => {
      const { data, error } = await supabase
        .from("trip_transports")
        .select(SELECT)
        .eq("trip_id", tripId!)
        .order("departs_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TripTransport[];
    },
  });

  useTripChannel(
    "trip-transports",
    tripId,
    ["trip_transports", "trip_transport_passengers"],
    tripTransportsKey(tripId),
  );

  return query;
}

export function useTransportMutations(tripId: string | null | undefined) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: tripTransportsKey(tripId) });

  const save = useMutation({
    mutationFn: async ({ id, input, userId }: { id?: string; input: TransportInput; userId: string }) => {
      if (id) {
        const { error } = await supabase.from("trip_transports").update(input).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase
        .from("trip_transports")
        .insert({ ...input, trip_id: tripId!, created_by: userId })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trip_transports").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const setPassengers = useMutation({
    mutationFn: async ({ transportId, current, next }: { transportId: string; current: string[]; next: string[] }) =>
      syncAssignments("trip_transport_passengers", "transport_id", transportId, current, next),
    onSuccess: invalidate,
  });

  return { save, remove, setPassengers, invalidate };
}
