import * as React from "react";
import { queryOptions, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AssigneeProfile } from "./useCoordinacion";

export interface InventoryItem {
  id: string;
  club_id: string;
  name: string;
  category: string | null;
  description: string | null;
  unit: string | null;
  total_quantity: number;
  min_quantity: number;
  image_path: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useInventoryImageUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["inv-image", path ?? "none"] as const,
    enabled: !!path,
    staleTime: 55 * 60_000,
    queryFn: async (): Promise<string | null> => {
      if (!path) return null;
      const { data, error } = await supabase.storage.from("inventory").createSignedUrl(path, 3600);
      if (error) return null;
      return data?.signedUrl ?? null;
    },
  });
}

export interface InventoryLoan {
  id: string;
  club_id: string;
  item_id: string;
  borrower_user_id: string;
  team_id: string | null;
  event_id: string | null;
  request_id: string | null;
  quantity: number;
  returned_quantity: number;
  expected_return_at: string | null;
  returned_at: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  item?: Pick<InventoryItem, "id" | "name" | "unit" | "image_path"> | null;
  borrower?: AssigneeProfile | null;
  team?: { id: string; name: string; category: string | null } | null;
  event?: { id: string; title: string; starts_at: string } | null;
}

export const inventoryItemsQueryOptions = (clubId: string | null | undefined) =>
  queryOptions({
    queryKey: ["inv-items", clubId ?? "none"] as const,
    enabled: !!clubId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<InventoryItem[]> => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .eq("club_id", clubId!)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as InventoryItem[];
    },
  });

export function useInventoryItems(clubId: string | null | undefined) {
  const qc = useQueryClient();
  const query = useQuery(inventoryItemsQueryOptions(clubId));

  React.useEffect(() => {
    if (!clubId) return;
    const channel = supabase
      .channel(`inv-items-${clubId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_items", filter: `club_id=eq.${clubId}` },
        () => qc.invalidateQueries({ queryKey: ["inv-items", clubId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [clubId, qc]);

  return query;
}

export const inventoryLoansQueryOptions = (clubId: string | null | undefined) =>
  queryOptions({
    queryKey: ["inv-loans", clubId ?? "none"] as const,
    enabled: !!clubId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<InventoryLoan[]> => {
      const { data, error } = await supabase
        .from("inventory_loans")
        .select(
          `id, club_id, item_id, borrower_user_id, team_id, event_id, request_id,
           quantity, returned_quantity, expected_return_at, returned_at, notes,
           created_by, created_at, updated_at,
           item:inventory_items(id, name, unit),
           borrower:profiles!inventory_loans_borrower_user_id_profiles_fkey(id, full_name, email, avatar_url),
           team:teams(id, name, category),
           event:calendar_events(id, title, starts_at)`,
        )
        .eq("club_id", clubId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any as InventoryLoan[];
    },
  });

export function useInventoryLoans(clubId: string | null | undefined) {
  const qc = useQueryClient();
  const query = useQuery(inventoryLoansQueryOptions(clubId));

  React.useEffect(() => {
    if (!clubId) return;
    const channel = supabase
      .channel(`inv-loans-${clubId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_loans", filter: `club_id=eq.${clubId}` },
        () => qc.invalidateQueries({ queryKey: ["inv-loans", clubId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [clubId, qc]);

  return query;
}

/** Cantidad prestada no devuelta por artículo. */
export function computeOutstanding(loans: InventoryLoan[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of loans) {
    if (l.returned_at) continue;
    out[l.item_id] = (out[l.item_id] ?? 0) + (l.quantity - l.returned_quantity);
  }
  return out;
}

export function itemAvailability(item: InventoryItem, outstanding: Record<string, number>): number {
  return Math.max(0, item.total_quantity - (outstanding[item.id] ?? 0));
}
