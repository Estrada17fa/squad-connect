import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTripChannel } from "./useTripChannel";
import type { TripMealType } from "@/lib/tripLogistics";

export interface TripMeal {
  id: string;
  trip_id: string;
  meal_type: TripMealType;
  scheduled_at: string;
  location: string | null;
  notes: string | null;
}

export interface MealInput {
  meal_type: TripMealType;
  scheduled_at: string;
  location: string | null;
  notes: string | null;
}

export const tripMealsKey = (tripId: string | null | undefined) => ["trip-meals", tripId ?? "none"] as const;

export function useTripMeals(tripId: string | null | undefined) {
  const query = useQuery({
    queryKey: tripMealsKey(tripId),
    enabled: !!tripId,
    queryFn: async (): Promise<TripMeal[]> => {
      const { data, error } = await supabase
        .from("trip_meals")
        .select("id, trip_id, meal_type, scheduled_at, location, notes")
        .eq("trip_id", tripId!)
        .order("scheduled_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TripMeal[];
    },
  });

  useTripChannel("trip-meals", tripId, ["trip_meals"], tripMealsKey(tripId));

  return query;
}

export function useMealMutations(tripId: string | null | undefined) {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: tripMealsKey(tripId) });

  const save = useMutation({
    mutationFn: async ({ id, input, userId }: { id?: string; input: MealInput; userId: string }) => {
      if (id) {
        const { error } = await supabase.from("trip_meals").update(input).eq("id", id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await supabase
        .from("trip_meals")
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
      const { error } = await supabase.from("trip_meals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { save, remove, invalidate };
}
