import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LocationRow {
  id: string;
  club_id: string;
  name: string;
  address: string | null;
  notes: string | null;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
  source: string | null;
  is_catalog: boolean;

  created_by: string | null;
  created_at: string;
  updated_at: string;
}

const db = supabase as any;

/** Catálogo visible del club (ubicaciones guardadas a propósito). */
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
        .eq("is_catalog", true)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as LocationRow[];
    },
  });
}

/** Todas las ubicaciones del club, incluidas las creadas desde otros módulos (borradores). */
export function useAllLocations(clubId: string | null | undefined) {
  return useQuery({
    queryKey: ["locations-all", clubId ?? "none"],
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

/** Una ubicación por id (esté o no en el catálogo visible). */
export function useLocation(locationId: string | null | undefined) {
  return useQuery({
    queryKey: ["location", locationId ?? "none"],
    enabled: !!locationId,
    staleTime: 60_000,
    queryFn: async (): Promise<LocationRow | null> => {
      const { data, error } = await db.from("locations").select("*").eq("id", locationId!).maybeSingle();
      if (error) throw error;
      return (data ?? null) as LocationRow | null;
    },
  });
}

/**
 * Deja persistida una ubicación elegida en el mapa y devuelve su fila.
 * Reutiliza la existente del club con el mismo place_id para no duplicar.
 * Se crea fuera del catálogo visible (is_catalog=false) hasta que se guarde a propósito.
 */
export function useResolveLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      club_id: string;
      name: string;
      address?: string | null;
      latitude: number;
      longitude: number;
      place_id?: string | null;
      created_by?: string | null;
    }): Promise<LocationRow> => {
      if (input.place_id) {
        const { data: existing, error: exErr } = await db
          .from("locations")
          .select("*")
          .eq("club_id", input.club_id)
          .eq("place_id", input.place_id)
          .maybeSingle();
        if (exErr) throw exErr;
        if (existing) return existing as LocationRow;
      }
      const { data, error } = await db
        .from("locations")
        .insert({
          club_id: input.club_id,
          name: input.name.trim(),
          address: input.address?.trim() || null,
          latitude: input.latitude,
          longitude: input.longitude,
          place_id: input.place_id ?? null,
          source: "osm",
          is_catalog: false,
          created_by: input.created_by ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as LocationRow;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["locations-all"] });
      qc.invalidateQueries({ queryKey: ["location", row.id] });
    },
  });
}

/** Marca una ubicación ya persistida como parte del catálogo del club. */
export function usePromoteLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<LocationRow> => {
      const { data, error } = await db
        .from("locations")
        .update({ is_catalog: true })
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as LocationRow;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["locations"] });
      qc.invalidateQueries({ queryKey: ["locations-all"] });
      qc.invalidateQueries({ queryKey: ["location", row.id] });
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
      latitude?: number | null;
      longitude?: number | null;
      place_id?: string | null;
      source?: string | null;
      is_catalog?: boolean;
      created_by?: string | null;
    }): Promise<LocationRow> => {
      const payload = {
        club_id: input.club_id,
        name: input.name.trim(),
        address: input.address?.trim() || null,
        notes: input.notes?.trim() || null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        place_id: input.place_id ?? null,
        source: input.source ?? null,
        is_catalog: input.is_catalog ?? true,
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
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["locations"] });
      qc.invalidateQueries({ queryKey: ["locations-all"] });
      qc.invalidateQueries({ queryKey: ["location", row.id] });
    },

  });
}

export function useDeleteLocation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const uses: Array<[string, string, string]> = [
        ["calendar_events", "location_id", "evento(s)"],
        ["meetings", "location_id", "junta(s)"],
        ["trips", "meeting_location_id", "viaje(s)"],
        ["trip_hotels", "location_id", "hotel(es)"],
      ];
      for (const [table, col, label] of uses) {
        const { count, error: cErr } = await db
          .from(table)
          .select("id", { count: "exact", head: true })
          .eq(col, id);
        if (cErr) throw cErr;
        if ((count ?? 0) > 0) {
          throw new Error(`No se puede eliminar: la ubicación se usa en ${count} ${label}.`);
        }
      }
      const { error } = await db.from("locations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["locations"] });
      qc.invalidateQueries({ queryKey: ["locations-all"] });
    },
  });
}
