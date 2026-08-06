import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTripChannel } from "./useTripChannel";
import { MINI_PROFILE_SELECT, type MiniProfile } from "@/lib/tripLogistics";

/**
 * Material de inventario que sale con el viaje.
 * Se apoya en `inventory_loans` (mismo patrón que Solicitudes → Préstamo):
 * la disponibilidad del catálogo baja sola y la devolución la regresa.
 */
export interface TripMaterialLoan {
  id: string;
  club_id: string;
  trip_id: string | null;
  item_id: string;
  borrower_user_id: string;
  quantity: number;
  returned_quantity: number;
  expected_return_at: string | null;
  returned_at: string | null;
  notes: string | null;
  item: { id: string; name: string; category: string | null; unit: string | null; image_path: string | null } | null;
  borrower: MiniProfile | null;
}

export interface TripMaterialInput {
  item_id: string;
  borrower_user_id: string;
  quantity: number;
  expected_return_at: string | null;
  notes: string | null;
}

const SELECT =
  "id, club_id, trip_id, item_id, borrower_user_id, quantity, returned_quantity, expected_return_at, returned_at, notes, " +
  "item:inventory_items(id, name, category, unit, image_path), " +
  `borrower:profiles!inventory_loans_borrower_user_id_profiles_fkey(${MINI_PROFILE_SELECT})`;

export const tripMaterialKey = (tripId: string | null | undefined) => ["trip-material", tripId ?? "none"] as const;

export function useTripMaterial(tripId: string | null | undefined) {
  const query = useQuery({
    queryKey: tripMaterialKey(tripId),
    enabled: !!tripId,
    queryFn: async (): Promise<TripMaterialLoan[]> => {
      const { data, error } = await supabase
        .from("inventory_loans")
        .select(SELECT)
        .eq("trip_id", tripId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as TripMaterialLoan[];
    },
  });

  useTripChannel("trip-material", tripId, ["inventory_loans"], tripMaterialKey(tripId));

  return query;
}

export function useTripMaterialMutations(tripId: string | null | undefined, clubId: string | null | undefined) {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: tripMaterialKey(tripId) });
    qc.invalidateQueries({ queryKey: ["inventory-catalog", clubId] });
    qc.invalidateQueries({ queryKey: ["inventory-loans", clubId] });
    qc.invalidateQueries({ queryKey: ["inventory-items", clubId] });
  };

  const create = useMutation({
    mutationFn: async ({ input, userId, teamId }: { input: TripMaterialInput; userId: string; teamId: string | null }) => {
      const { error } = await supabase.from("inventory_loans").insert({
        ...input,
        trip_id: tripId!,
        club_id: clubId!,
        team_id: teamId,
        created_by: userId,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: Partial<TripMaterialInput> }) => {
      const { error } = await supabase.from("inventory_loans").update(input).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /** Devolución total o parcial: suma piezas a `returned_quantity`. */
  const registerReturn = useMutation({
    mutationFn: async ({ loan, quantity }: { loan: TripMaterialLoan; quantity: number }) => {
      const { error } = await supabase
        .from("inventory_loans")
        .update({ returned_quantity: loan.returned_quantity + quantity })
        .eq("id", loan.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory_loans").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { create, update, registerReturn, remove, invalidate };
}

export function materialOutstanding(loan: Pick<TripMaterialLoan, "quantity" | "returned_quantity">): number {
  return Math.max(loan.quantity - loan.returned_quantity, 0);
}
