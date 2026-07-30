import * as React from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Catálogo mínimo de inventario visible para cualquier miembro del club
 * (solo lo necesario para elegir material en una solicitud).
 * La función SQL public.inventory_catalog acota por has_club_access.
 */
export interface InventoryCatalogItem {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  image_path: string | null;
  total_quantity: number;
  available_quantity: number;
}

export const inventoryCatalogQueryOptions = (clubId: string | null | undefined) =>
  queryOptions({
    queryKey: ["inventory-catalog", clubId ?? "none"] as const,
    enabled: !!clubId,
    staleTime: 60_000,
    queryFn: async (): Promise<InventoryCatalogItem[]> => {
      const { data, error } = await (supabase as any).rpc("inventory_catalog", { _club_id: clubId });
      if (error) throw error;
      return (data ?? []) as InventoryCatalogItem[];
    },
  });

export function useInventoryCatalog(clubId: string | null | undefined) {
  return useQuery(inventoryCatalogQueryOptions(clubId));
}

/** Miniaturas firmadas del bucket privado `inventory`, por ruta. */
export function useInventoryThumbnails(paths: (string | null | undefined)[]) {
  const clean = React.useMemo(
    () => [...new Set(paths.filter(Boolean) as string[])].sort(),
    [paths.join("|")], // eslint-disable-line react-hooks/exhaustive-deps
  );
  return useQuery({
    queryKey: ["inventory-thumbs", clean] as const,
    enabled: clean.length > 0,
    staleTime: 45 * 60_000,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase.storage.from("inventory").createSignedUrls(clean, 3600);
      if (error) throw error;
      const out: Record<string, string> = {};
      for (const d of data ?? []) {
        if (d.path && d.signedUrl) out[d.path] = d.signedUrl;
      }
      return out;
    },
  });
}

/** URL firmada individual de un adjunto de solicitud. */
export function useRequestAttachmentUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["request-attachment", path ?? "none"] as const,
    enabled: !!path,
    staleTime: 45 * 60_000,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.storage
        .from("request-attachments")
        .createSignedUrl(path!, 3600);
      if (error) throw error;
      return data?.signedUrl ?? null;
    },
  });
}
