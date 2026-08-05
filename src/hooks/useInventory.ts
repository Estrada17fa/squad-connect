import * as React from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
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

/** Fila completa del artículo (para editar en el módulo de inventario). */
export interface InventoryItemRow {
  id: string;
  club_id: string;
  name: string;
  category: string | null;
  description: string | null;
  unit: string | null;
  total_quantity: number;
  min_quantity: number;
  image_path: string | null;
  created_at: string;
  updated_at: string;
}

export const inventoryItemsQueryOptions = (clubId: string | null | undefined) =>
  queryOptions({
    queryKey: ["inventory-items", clubId ?? "none"] as const,
    enabled: !!clubId,
    staleTime: 30_000,
    queryFn: async (): Promise<InventoryItemRow[]> => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select(
          "id, club_id, name, category, description, unit, total_quantity, min_quantity, image_path, created_at, updated_at",
        )
        .eq("club_id", clubId!)
        .order("name");
      if (error) throw error;
      return (data ?? []) as InventoryItemRow[];
    },
  });

export function useInventoryItems(clubId: string | null | undefined) {
  return useQuery(inventoryItemsQueryOptions(clubId));
}

/** Préstamo con toda su información asociada. */
export interface LoanRow {
  id: string;
  club_id: string;
  item_id: string;
  borrower_user_id: string;
  team_id: string | null;
  request_id: string | null;
  quantity: number;
  returned_quantity: number;
  expected_return_at: string | null;
  returned_at: string | null;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  item: { id: string; name: string; category: string | null; unit: string | null; image_path: string | null } | null;
  borrower: { id: string; full_name: string | null; email: string | null; avatar_url: string | null } | null;
  team: { id: string; name: string; category: string } | null;
}

export const inventoryLoansQueryOptions = (clubId: string | null | undefined) =>
  queryOptions({
    queryKey: ["inventory-loans", clubId ?? "none"] as const,
    enabled: !!clubId,
    staleTime: 30_000,
    queryFn: async (): Promise<LoanRow[]> => {
      const { data, error } = await supabase
        .from("inventory_loans")
        .select(
          "id, club_id, item_id, borrower_user_id, team_id, request_id, quantity, returned_quantity, expected_return_at, returned_at, notes, created_at, created_by, item:inventory_items(id, name, category, unit, image_path), borrower:profiles!inventory_loans_borrower_user_id_profiles_fkey(id, full_name, email, avatar_url), team:teams(id, name, category)",
        )
        .eq("club_id", clubId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as LoanRow[];
    },
  });

export function useInventoryLoans(clubId: string | null | undefined) {
  const qc = useQueryClient();
  const query = useQuery(inventoryLoansQueryOptions(clubId));

  React.useEffect(() => {
    if (!clubId) return;
    const invalidate = () => {
      qc.invalidateQueries({ queryKey: ["inventory-loans", clubId] });
      qc.invalidateQueries({ queryKey: ["inventory-catalog", clubId] });
      qc.invalidateQueries({ queryKey: ["inventory-items", clubId] });
    };
    const channel = supabase
      .channel(`inventory-${clubId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_loans", filter: `club_id=eq.${clubId}` },
        invalidate,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "inventory_items", filter: `club_id=eq.${clubId}` },
        invalidate,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [clubId, qc]);

  return query;
}

/** Préstamo generado desde una solicitud de material (o null si aún no existe). */
export function useRequestLoan(requestId: string | null | undefined) {
  return useQuery({
    queryKey: ["request-loan", requestId ?? "none"] as const,
    enabled: !!requestId,
    staleTime: 15_000,
    queryFn: async (): Promise<LoanRow | null> => {
      const { data, error } = await supabase
        .from("inventory_loans")
        .select(
          "id, club_id, item_id, borrower_user_id, team_id, request_id, quantity, returned_quantity, expected_return_at, returned_at, notes, created_at, created_by, item:inventory_items(id, name, category, unit, image_path), borrower:profiles!inventory_loans_borrower_user_id_profiles_fkey(id, full_name, email, avatar_url), team:teams(id, name, category)",
        )
        .eq("request_id", requestId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as LoanRow | null;
    },
  });
}


export function useClubTeams(clubId: string | null | undefined) {
  return useQuery({
    queryKey: ["club-teams", clubId ?? "none"] as const,
    enabled: !!clubId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teams")
        .select("id, name, category")
        .eq("club_id", clubId!)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
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

/** Saldo pendiente de un préstamo (lo que aún no regresa). */
export function loanOutstanding(loan: Pick<LoanRow, "quantity" | "returned_quantity">): number {
  return Math.max(loan.quantity - loan.returned_quantity, 0);
}

export function isLoanOverdue(loan: Pick<LoanRow, "expected_return_at" | "returned_at">): boolean {
  if (loan.returned_at || !loan.expected_return_at) return false;
  return new Date(loan.expected_return_at).getTime() < Date.now();
}
