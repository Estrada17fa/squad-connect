import * as React from "react";
import { queryOptions, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { AssigneeProfile } from "./useCoordinacion";

export type RequestType =
  | "material"
  | "compra"
  | "pago_proveedor"
  | "permiso"
  | "cortesias"
  | "reembolso"
  | "medica"
  | "otro";

export type RequestStatus = "pendiente" | "aprobada" | "rechazada" | "cancelada" | "completada";

export interface RequestRow {
  id: string;
  club_id: string;
  type: RequestType;
  status: RequestStatus;
  requester_id: string;
  title: string;
  description: string | null;
  details: Record<string, any>;
  amount: number | null;
  currency: string | null;
  needed_at: string | null;
  decided_at: string | null;
  decided_by: string | null;
  decision_note: string | null;
  related_item_id: string | null;
  related_event_id: string | null;
  related_loan_id: string | null;
  created_at: string;
  updated_at: string;
  requester?: AssigneeProfile | null;
  decider?: AssigneeProfile | null;
  item?: { id: string; name: string; unit: string | null; image_path: string | null } | null;
  event?: { id: string; title: string; starts_at: string } | null;
}

export interface RequestComment {
  id: string;
  request_id: string;
  user_id: string;
  body: string | null;
  kind: "comment" | "reminder" | "system";
  created_at: string;
  author?: AssigneeProfile | null;
}

export const REQUEST_TYPE_LABEL: Record<RequestType, string> = {
  material: "Material / préstamo",
  compra: "Compra",
  pago_proveedor: "Pago a proveedor",
  permiso: "Permiso / días",
  cortesias: "Boletos de cortesía",
  reembolso: "Reembolso / viáticos",
  medica: "Médica",
  otro: "Otro",
};

export const REQUEST_STATUS_LABEL: Record<RequestStatus, string> = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
  cancelada: "Cancelada",
  completada: "Completada",
};

export const requestsQueryOptions = (clubId: string | null | undefined) =>
  queryOptions({
    queryKey: ["requests", clubId ?? "none"] as const,
    enabled: !!clubId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<RequestRow[]> => {
      const { data, error } = await supabase
        .from("requests")
        .select(
          `id, club_id, type, status, requester_id, title, description, details, amount, currency,
           needed_at, decided_at, decided_by, decision_note,
           related_item_id, related_event_id, related_loan_id, created_at, updated_at,
           requester:profiles!requests_requester_id_profiles_fkey(id, full_name, email, avatar_url),
           decider:profiles!requests_decided_by_profiles_fkey(id, full_name, email, avatar_url),
           item:inventory_items(id, name, unit, image_path),
           event:calendar_events(id, title, starts_at)`,
        )
        .eq("club_id", clubId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any as RequestRow[];
    },
  });

export function useRequests(clubId: string | null | undefined) {
  const qc = useQueryClient();
  const query = useQuery(requestsQueryOptions(clubId));

  React.useEffect(() => {
    if (!clubId) return;
    const channel = supabase
      .channel(`requests-${clubId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "requests", filter: `club_id=eq.${clubId}` },
        () => qc.invalidateQueries({ queryKey: ["requests", clubId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [clubId, qc]);

  return query;
}

export function useRequestComments(requestId: string | null | undefined) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["request-comments", requestId ?? "none"] as const,
    enabled: !!requestId,
    staleTime: 15_000,
    queryFn: async (): Promise<RequestComment[]> => {
      const { data, error } = await supabase
        .from("request_comments")
        .select(`id, request_id, user_id, body, kind, created_at,
                 author:profiles!request_comments_user_id_profiles_fkey(id, full_name, email, avatar_url)`)
        .eq("request_id", requestId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as any as RequestComment[];
    },
  });

  React.useEffect(() => {
    if (!requestId) return;
    const channel = supabase
      .channel(`req-comments-${requestId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "request_comments", filter: `request_id=eq.${requestId}` },
        () => qc.invalidateQueries({ queryKey: ["request-comments", requestId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [requestId, qc]);

  return query;
}
