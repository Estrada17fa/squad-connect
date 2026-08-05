import * as React from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ExpenseCategory, PaymentStatus } from "@/lib/expenses";

export interface SupplierRow {
  id: string;
  club_id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export interface ExpenseRow {
  id: string;
  club_id: string;
  concept: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  supplier_id: string | null;
  supplier_name: string | null;
  expense_date: string;
  payment_status: PaymentStatus;
  paid_at: string | null;
  receipt_path: string | null;
  notes: string | null;
  request_id: string | null;
  created_by: string | null;
  created_at: string;
  supplier: { id: string; name: string } | null;
  creator: { id: string; full_name: string | null; email: string | null } | null;
}

const EXPENSE_SELECT =
  "id, club_id, concept, amount, currency, category, supplier_id, supplier_name, expense_date, payment_status, paid_at, receipt_path, notes, request_id, created_by, created_at, supplier:suppliers(id, name), creator:profiles!expenses_created_by_fkey(id, full_name, email)";

export const expensesQueryOptions = (clubId: string | null | undefined) =>
  queryOptions({
    queryKey: ["expenses", clubId ?? "none"] as const,
    enabled: !!clubId,
    staleTime: 30_000,
    queryFn: async (): Promise<ExpenseRow[]> => {
      const { data, error } = await supabase
        .from("expenses")
        .select(EXPENSE_SELECT)
        .eq("club_id", clubId!)
        .order("expense_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ExpenseRow[];
    },
  });

export function useExpenses(clubId: string | null | undefined) {
  const qc = useQueryClient();
  const query = useQuery(expensesQueryOptions(clubId));

  React.useEffect(() => {
    if (!clubId) return;
    const channel = supabase
      .channel(`expenses-${clubId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "expenses", filter: `club_id=eq.${clubId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["expenses", clubId] });
          qc.invalidateQueries({ queryKey: ["expense-report", clubId] });
          qc.invalidateQueries({ queryKey: ["expense-summary", clubId] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [clubId, qc]);

  return query;
}

export const suppliersQueryOptions = (clubId: string | null | undefined) =>
  queryOptions({
    queryKey: ["suppliers", clubId ?? "none"] as const,
    enabled: !!clubId,
    staleTime: 60_000,
    queryFn: async (): Promise<SupplierRow[]> => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("id, club_id, name, contact, phone, email, notes, created_at")
        .eq("club_id", clubId!)
        .order("name");
      if (error) throw error;
      return (data ?? []) as SupplierRow[];
    },
  });

export function useSuppliers(clubId: string | null | undefined) {
  return useQuery(suppliersQueryOptions(clubId));
}

/** Gasto ligado a una solicitud (o null si aún no se registra). */
export function useRequestExpense(requestId: string | null | undefined) {
  return useQuery({
    queryKey: ["request-expense", requestId ?? "none"] as const,
    enabled: !!requestId,
    staleTime: 15_000,
    queryFn: async (): Promise<ExpenseRow | null> => {
      const { data, error } = await supabase
        .from("expenses")
        .select(EXPENSE_SELECT)
        .eq("request_id", requestId!)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as ExpenseRow | null;
    },
  });
}

export interface ExpenseReportRow {
  category: ExpenseCategory;
  total: number;
  pending_total: number;
  paid_total: number;
  expense_count: number;
}

/** Totales agregados en el servidor (no se suman gastos en el cliente). */
export function useExpenseReport(
  clubId: string | null | undefined,
  from: string,
  to: string,
) {
  return useQuery({
    queryKey: ["expense-report", clubId ?? "none", from, to] as const,
    enabled: !!clubId,
    staleTime: 30_000,
    queryFn: async (): Promise<ExpenseReportRow[]> => {
      const { data, error } = await supabase.rpc("expense_report", {
        _club_id: clubId!,
        _from: from,
        _to: to,
      });
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        category: r.category as ExpenseCategory,
        total: Number(r.total),
        pending_total: Number(r.pending_total),
        paid_total: Number(r.paid_total),
        expense_count: Number(r.expense_count),
      }));
    },
  });
}

export interface ExpenseSummary {
  pending_total: number;
  month_total: number;
  pending_count: number;
}

/** Resumen ligero para Home: pendiente por pagar y gasto del mes. */
export function useExpenseSummary(clubId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: ["expense-summary", clubId ?? "none"] as const,
    enabled: !!clubId && enabled,
    staleTime: 60_000,
    queryFn: async (): Promise<ExpenseSummary> => {
      const { data, error } = await supabase.rpc("expense_summary", { _club_id: clubId! });
      if (error) throw error;
      const row = (data as any[])?.[0];
      return {
        pending_total: Number(row?.pending_total ?? 0),
        month_total: Number(row?.month_total ?? 0),
        pending_count: Number(row?.pending_count ?? 0),
      };
    },
  });
}

/** URL firmada del comprobante en el bucket privado `expense-receipts`. */
export function useReceiptUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["expense-receipt", path ?? "none"] as const,
    enabled: !!path,
    staleTime: 45 * 60_000,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.storage
        .from("expense-receipts")
        .createSignedUrl(path!, 3600);
      if (error) throw error;
      return data?.signedUrl ?? null;
    },
  });
}
