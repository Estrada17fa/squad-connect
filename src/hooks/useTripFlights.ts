import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTripChannel, syncAssignments } from "./useTripChannel";
import { MINI_PROFILE_SELECT, type MiniProfile, type TripLeg } from "@/lib/tripLogistics";

export interface TripBoardingPass {
  id: string;
  flight_id: string;
  user_id: string | null;
  file_path: string;
  seat: string | null;
  notes: string | null;
  profile: MiniProfile | null;
}

export interface TripFlight {
  id: string;
  trip_id: string;
  leg: TripLeg;
  flight_code: string;
  airline: string | null;
  departs_at: string;
  arrives_at: string | null;
  origin: string;
  destination: string;
  gate: string | null;
  notes: string | null;
  passengers: { id: string; user_id: string; profile: MiniProfile | null }[];
  boarding_passes: TripBoardingPass[];
}

export interface FlightInput {
  leg: TripLeg;
  flight_code: string;
  airline: string | null;
  departs_at: string;
  arrives_at: string | null;
  origin: string;
  destination: string;
  gate: string | null;
  notes: string | null;
}

const SELECT =
  `id, trip_id, leg, flight_code, airline, departs_at, arrives_at, origin, destination, gate, notes, ` +
  `passengers:trip_flight_passengers(id, user_id, profile:profiles(${MINI_PROFILE_SELECT})), ` +
  `boarding_passes:trip_boarding_passes(id, flight_id, user_id, file_path, seat, notes, profile:profiles(${MINI_PROFILE_SELECT}))`;

export const tripFlightsKey = (tripId: string | null | undefined) => ["trip-flights", tripId ?? "none"] as const;

export function useTripFlights(tripId: string | null | undefined) {
  const query = useQuery({
    queryKey: tripFlightsKey(tripId),
    enabled: !!tripId,
    queryFn: async (): Promise<TripFlight[]> => {
      const { data, error } = await supabase
        .from("trip_flights")
        .select(SELECT)
        .eq("trip_id", tripId!)
        .order("departs_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TripFlight[];
    },
  });

  useTripChannel(
    "trip-flights",
    tripId,
    ["trip_flights", "trip_flight_passengers", "trip_boarding_passes"],
    tripFlightsKey(tripId),
  );

  return query;
}

/** Mutaciones de vuelos: crear, actualizar, eliminar y asignar pasajeros. */
export function useFlightMutations(tripId: string | null | undefined) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: tripFlightsKey(tripId) });

  const save = useMutation({
    mutationFn: async ({ id, input, userId }: { id?: string; input: FlightInput; userId: string }) => {
      if (id) {
        const { error } = await supabase.from("trip_flights").update(input).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase
        .from("trip_flights")
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
      const { error } = await supabase.from("trip_flights").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const setPassengers = useMutation({
    mutationFn: async ({ flightId, current, next }: { flightId: string; current: string[]; next: string[] }) =>
      syncAssignments("trip_flight_passengers", "flight_id", flightId, current, next),
    onSuccess: invalidate,
  });

  return { save, remove, setPassengers, invalidate };
}
