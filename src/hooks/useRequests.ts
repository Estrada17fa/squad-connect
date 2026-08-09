import * as React from "react";
import { queryOptions, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { RequestStatus, RequestType } from "@/lib/requestTypes";

export interface RequestProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export interface RequestRow {
  id: string;
  club_id: string;
  /** Categoría/equipo dueño de la solicitud. null = todo el club. */
  team_id: string | null;
  team: { id: string; name: string; category: string | null } | null;
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
  related_loan_id: string | null;
  created_at: string;
  updated_at: string;
  requester: RequestProfile | null;
  decider: RequestProfile | null;
}

export interface RequestHistoryRow {
  id: string;
  request_id: string;
  from_status: RequestStatus | null;
  to_status: RequestStatus;
  note: string | null;
  changed_by: string | null;
  created_at: string;
  actor: RequestProfile | null;
}

const SELECT =
  "id, club_id, team_id, type, status, requester_id, title, description, details, amount, currency, needed_at, decided_at, decided_by, decision_note, related_item_id, related_loan_id, created_at, updated_at, team:teams(id, name, category), requester:profiles!requests_requester_id_profiles_fkey(id, full_name, email, avatar_url), decider:profiles!requests_decided_by_profiles_fkey(id, full_name, email, avatar_url)";


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
        .select(SELECT)
        .eq("club_id", clubId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        details: (r.details ?? {}) as Record<string, any>,
      })) as RequestRow[];
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
      .on("postgres_changes", { event: "*", schema: "public", table: "request_status_history" }, () => {
        qc.invalidateQueries({ queryKey: ["requests", clubId] });
        qc.invalidateQueries({ queryKey: ["request-history"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [clubId, qc]);

  return query;
}

export function useRequestHistory(requestId: string | null | undefined) {
  return useQuery({
    queryKey: ["request-history", requestId ?? "none"],
    enabled: !!requestId,
    queryFn: async (): Promise<RequestHistoryRow[]> => {
      const { data, error } = await supabase
        .from("request_status_history")
        .select("id, request_id, from_status, to_status, note, changed_by, created_at")
        .eq("request_id", requestId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const ids = [...new Set(rows.map((r) => r.changed_by).filter(Boolean))] as string[];
      let profiles: Record<string, RequestProfile> = {};
      if (ids.length) {
        const { data: ps } = await supabase
          .from("profiles")
          .select("id, full_name, email, avatar_url")
          .in("id", ids);
        profiles = Object.fromEntries((ps ?? []).map((p: any) => [p.id, p]));
      }
      return rows.map((r) => ({ ...r, actor: r.changed_by ? profiles[r.changed_by] ?? null : null })) as RequestHistoryRow[];
    },
  });
}

