import { createServerFn } from "@tanstack/react-start";

export interface GeocodeResult {
  /** Identificador del lugar en OpenStreetMap. */
  placeId: string;
  /** Nombre corto del lugar. */
  name: string;
  /** Dirección completa. */
  address: string;
  latitude: number;
  longitude: number;
}

/**
 * Búsqueda de lugares con Nominatim (OpenStreetMap).
 * API pública gratuita, sin API key. Requiere identificar la aplicación.
 */
export const searchPlaces = createServerFn({ method: "GET" })
  .inputValidator((input: { q: string }) => ({ q: String(input?.q ?? "").trim() }))
  .handler(async ({ data }): Promise<GeocodeResult[]> => {
    if (data.q.length < 3) return [];
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", data.q);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "8");
    url.searchParams.set("accept-language", "es");

    try {
      const res = await fetch(url.toString(), {
        headers: {
          "User-Agent": "Squad-Club-Manager/1.0 (https://lovable.app)",
          Accept: "application/json",
        },
      });
      if (!res.ok) return [];
      const rows = (await res.json()) as any[];
      return rows.map((r) => {
        const full: string = r.display_name ?? "";
        const name: string = r.name && r.name.length ? r.name : (full.split(",")[0] ?? full);
        return {
          placeId: String(r.place_id ?? `${r.lat},${r.lon}`),
          name,
          address: full,
          latitude: Number(r.lat),
          longitude: Number(r.lon),
        };
      });
    } catch {
      return [];
    }
  });
