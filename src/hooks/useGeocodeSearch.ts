import { useQuery } from "@tanstack/react-query";
import { searchPlaces, type GeocodeResult } from "@/lib/geocode.functions";

export type { GeocodeResult };

/** Búsqueda de lugares en OpenStreetMap (Nominatim), con debounce implícito por staleTime. */
export function useGeocodeSearch(query: string, enabled = true) {
  const q = query.trim();
  return useQuery({
    queryKey: ["geocode", q],
    enabled: enabled && q.length >= 3,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<GeocodeResult[]> => await searchPlaces({ data: { q } }),
  });
}
