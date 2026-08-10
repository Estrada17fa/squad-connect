import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTripChannel } from "./useTripChannel";

/** Equipaje personal de cada convocado: maleta documentada y/o de mano. */
export interface TravelerLuggageRow {
  id: string;
  trip_id: string;
  user_id: string;
  checked_bag: boolean;
  carry_on: boolean;
}

export const tripTravelerLuggageKey = (tripId: string | null | undefined) =>
  ["trip-traveler-luggage", tripId ?? "none"] as const;

const table = () => (supabase as unknown as { from: (t: string) => any }).from("trip_traveler_luggage");

export function useTripTravelerLuggage(tripId: string | null | undefined) {
  const query = useQuery({
    queryKey: tripTravelerLuggageKey(tripId),
    enabled: !!tripId,
    queryFn: async (): Promise<TravelerLuggageRow[]> => {
      const { data, error } = await table()
        .select("id, trip_id, user_id, checked_bag, carry_on")
        .eq("trip_id", tripId!);
      if (error) throw error;
      return (data ?? []) as TravelerLuggageRow[];
    },
  });

  useTripChannel("trip-traveler-luggage", tripId, ["trip_traveler_luggage"], tripTravelerLuggageKey(tripId));

  return query;
}

export function useTravelerLuggageMutations(tripId: string | null | undefined) {
  const qc = useQueryClient();

  const setFlags = useMutation({
    mutationFn: async ({
      userId,
      checked_bag,
      carry_on,
      currentUserId,
    }: {
      userId: string;
      checked_bag: boolean;
      carry_on: boolean;
      currentUserId: string;
    }) => {
      const { error } = await table().upsert(
        { trip_id: tripId!, user_id: userId, checked_bag, carry_on, created_by: currentUserId },
        { onConflict: "trip_id,user_id" },
      );
      if (error) throw error;
    },
    onMutate: async ({ userId, checked_bag, carry_on }) => {
      const key = tripTravelerLuggageKey(tripId);
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<TravelerLuggageRow[]>(key) ?? [];
      const exists = prev.some((r) => r.user_id === userId);
      qc.setQueryData<TravelerLuggageRow[]>(
        key,
        exists
          ? prev.map((r) => (r.user_id === userId ? { ...r, checked_bag, carry_on } : r))
          : [...prev, { id: `tmp-${userId}`, trip_id: tripId ?? "", user_id: userId, checked_bag, carry_on }],
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(tripTravelerLuggageKey(tripId), ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: tripTravelerLuggageKey(tripId) }),
  });

  return { setFlags };
}
