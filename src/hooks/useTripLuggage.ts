import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTripChannel } from "./useTripChannel";
import { MINI_PROFILE_SELECT, type MiniProfile } from "@/lib/tripLogistics";

export interface TripLuggage {
  id: string;
  trip_id: string;
  description: string;
  quantity: number | null;
  responsible_user_id: string | null;
  notes: string | null;
  responsible: MiniProfile | null;
}

export interface LuggageInput {
  description: string;
  quantity: number | null;
  responsible_user_id: string | null;
  notes: string | null;
}

export const tripLuggageKey = (tripId: string | null | undefined) => ["trip-luggage", tripId ?? "none"] as const;

export function useTripLuggage(tripId: string | null | undefined) {
  const query = useQuery({
    queryKey: tripLuggageKey(tripId),
    enabled: !!tripId,
    queryFn: async (): Promise<TripLuggage[]> => {
      const { data, error } = await supabase
        .from("trip_luggage")
        .select(
          `id, trip_id, description, quantity, responsible_user_id, notes, responsible:profiles!trip_luggage_responsible_user_id_fkey(${MINI_PROFILE_SELECT})`,
        )
        .eq("trip_id", tripId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TripLuggage[];
    },
  });

  useTripChannel("trip-luggage", tripId, ["trip_luggage"], tripLuggageKey(tripId));

  return query;
}

export function useLuggageMutations(tripId: string | null | undefined) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: tripLuggageKey(tripId) });

  const save = useMutation({
    mutationFn: async ({ id, input, userId }: { id?: string; input: LuggageInput; userId: string }) => {
      if (id) {
        const { error } = await supabase.from("trip_luggage").update(input).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase
        .from("trip_luggage")
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
      const { error } = await supabase.from("trip_luggage").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { save, remove, invalidate };
}
