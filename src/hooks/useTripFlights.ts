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
  boarding_group: string | null;
  terminal: string | null;
  notes: string | null;
  profile: MiniProfile | null;
}

/** Quién documenta (factura) las maletas del equipo en un vuelo. */
export interface FlightBaggageHandler {
  id: string;
  flight_id: string;
  user_id: string;
  pieces: number | null;
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
  baggage_instructions: string | null;
  passengers: { id: string; user_id: string; profile: MiniProfile | null }[];
  boarding_passes: TripBoardingPass[];
  baggage_handlers: FlightBaggageHandler[];
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
  baggage_instructions: string | null;
}

const SELECT =
  `id, trip_id, leg, flight_code, airline, departs_at, arrives_at, origin, destination, gate, notes, baggage_instructions, ` +
  `passengers:trip_flight_passengers(id, user_id, profile:profiles(${MINI_PROFILE_SELECT})), ` +
  `boarding_passes:trip_boarding_passes(id, flight_id, user_id, file_path, seat, notes, profile:profiles(${MINI_PROFILE_SELECT})), ` +
  `baggage_handlers:trip_flight_baggage_handlers(id, flight_id, user_id, pieces, profile:profiles(${MINI_PROFILE_SELECT}))`;

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
    ["trip_flights", "trip_flight_passengers", "trip_boarding_passes", "trip_flight_baggage_handlers"],
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

  /**
   * Sincroniza quiénes documentan las maletas del equipo en un vuelo.
   * `next` trae la lista completa con sus piezas; se borra lo que sobra,
   * se inserta lo nuevo y se actualizan las piezas de los que siguen.
   */
  const setBaggageHandlers = useMutation({
    mutationFn: async ({
      flightId,
      current,
      next,
    }: {
      flightId: string;
      current: FlightBaggageHandler[];
      next: { user_id: string; pieces: number | null }[];
    }) => {
      const nextIds = new Set(next.map((n) => n.user_id));
      const toRemove = current.filter((c) => !nextIds.has(c.user_id)).map((c) => c.id);
      if (toRemove.length) {
        const { error } = await supabase.from("trip_flight_baggage_handlers").delete().in("id", toRemove);
        if (error) throw error;
      }
      for (const n of next) {
        const existing = current.find((c) => c.user_id === n.user_id);
        if (existing) {
          if (existing.pieces !== n.pieces) {
            const { error } = await supabase
              .from("trip_flight_baggage_handlers")
              .update({ pieces: n.pieces })
              .eq("id", existing.id);
            if (error) throw error;
          }
        } else {
          const { error } = await supabase
            .from("trip_flight_baggage_handlers")
            .insert({ flight_id: flightId, user_id: n.user_id, pieces: n.pieces });
          if (error) throw error;
        }
      }
    },
    onSuccess: invalidate,
  });

  return { save, remove, setPassengers, setBaggageHandlers, invalidate };
}
