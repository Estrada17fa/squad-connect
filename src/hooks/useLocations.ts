import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LocationRow {
  id: string;
  club_id: string;
  name: string;
  address: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const db = supabase as any;

export function useLocations(clubId: string | null | undefined) {
  return useQuery({
    queryKey: ["locations", clubId ?? "none"],
    enabled: !!clubId,
    staleTime: 60_000,
    queryFn: async (): Promise<LocationRow[]> => {
      const { data, error } = await db
        .from("locations")
        .select("*")
        .eq("club_id", clubId!)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as LocationRow[];
    },
  });
}

export function useSaveLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      club_id: string;
      name: string;
      address?: string | null;
      notes?: string | null;
      created_by?: string | null;
    }): Promise<LocationRow> => {
      const payload = {
        club_id: input.club_id,
        name: input.name.trim(),
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
      };
      if (input.id) {
        const { data, error } = await db
          .from("locations")
          .update(payload)
          .eq("id", input.id)
          .select("*")
          .single();
        if (error) throw error;
        return data as LocationRow;
      }
      const { data, error } = await db
        .from("locations")
        .insert({ ...payload, created_by: input.created_by ?? null })
        .select("*")
        .single();
      if (error) throw error;
      return data as LocationRow;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["locations"] }),
  });
}

export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { count, error: cErr } = await db
        .from("calendar_events")
        .select("id", { count: "exact", head: true })
        .eq("location_id", id);
      if (cErr) throw cErr;
      if ((count ?? 0) > 0) {
        throw new Error(`No se puede eliminar: el lugar se usa en ${count} evento(s).`);
      }
      const { error } = await db.from("locations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["locations"] }),
  });
}
