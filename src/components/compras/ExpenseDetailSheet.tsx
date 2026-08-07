import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { BadgeCheck, Download, ExternalLink, FileText, Pencil, Trash2 } from "lucide-react";
import { DetailSheet } from "@/components/squad/DetailSheet";
import { StatusBadge } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useReceiptUrl, type ExpenseRow } from "@/hooks/useExpenses";
import {
  EXPENSE_CATEGORY_MAP,
  PAYMENT_LABEL,
  PAYMENT_VARIANT,
  formatDay,
  formatMoney,
} from "@/lib/expenses";
import { formatDateTime } from "@/lib/calendar-utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  expense: ExpenseRow | null;
  canEdit: boolean;
  onEdit: (e: ExpenseRow) => void;
}

/** Solicitud que originó el gasto (sincronización visible en ambos lados). */
function useLinkedRequest(requestId: string | null | undefined) {
  return useQuery({
    queryKey: ["expense-request", requestId ?? "none"] as const,
    enabled: !!requestId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("requests")
        .select("id, title, type, status, requester:profiles!requests_requester_id_profiles_fkey(full_name, email)")
        .eq("id", requestId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

export function ExpenseDetailSheet({ open, onOpenChange, expense, canEdit, onEdit }: Props) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const receiptQ = useReceiptUrl(open ? expense?.receipt_path ?? null : null);
  const requestQ = useLinkedRequest(open ? expense?.request_id ?? null : null);
  const [zoom, setZoom] = React.useState(false);

  const markPaid = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("expenses")
        .update({ payment_status: "pagado" as const })
        .eq("id", expense!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Gasto marcado como pagado");
      qc.invalidateQueries({ queryKey: ["expenses", expense!.club_id] });
      qc.invalidateQueries({ queryKey: ["expense-report", expense!.club_id] });
      qc.invalidateQueries({ queryKey: ["expense-summary", expense!.club_id] });
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo actualizar"),
  });

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("expenses").delete().eq("id", expense!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Gasto eliminado");
      qc.invalidateQueries({ queryKey: ["expenses", expense!.club_id] });
      qc.invalidateQueries({ queryKey: ["expense-report", expense!.club_id] });
      qc.invalidateQueries({ queryKey: ["expense-summary", expense!.club_id] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
  });

  if (!expense) return null;

  const cat = EXPENSE_CATEGORY_MAP[expense.category];
  const Icon = cat.icon;
  const supplier = expense.supplier?.name ?? expense.supplier_name ?? null;
  const isImage = !!expense.receipt_path && !/\.pdf$/i.test(expense.receipt_path);

  return (
    <>
      <DetailSheet
        open={open}
        onOpenChange={onOpenChange}
        title={expense.concept}
        description={`${formatMoney(expense.amount, expense.currency)} · ${cat.label}`}
        headerActions={
          canEdit ? (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => onEdit(expense)}>
                <Pencil className="mr-2 h-4 w-4" /> Editar
              </Button>
              {expense.payment_status === "pendiente" ? (
                <Button
                  type="button"
                  size="sm"
                  className="glow-primary"
                  onClick={() => markPaid.mutate()}
                  disabled={markPaid.isPending}
                >
                  <BadgeCheck className="mr-2 h-4 w-4" /> Marcar como pagado
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => remove.mutate()}
                disabled={remove.isPending}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
              </Button>
            </>
          ) : undefined
        }
      >
        <div className="glass flex items-center gap-3 p-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-semibold text-foreground">
              {formatMoney(expense.amount, expense.currency)}
            </p>
            <p className="text-xs text-muted-foreground">Registrado el {formatDateTime(expense.created_at)}</p>
          </div>
          <StatusBadge variant={PAYMENT_VARIANT[expense.payment_status]}>
            {PAYMENT_LABEL[expense.payment_status]}
          </StatusBadge>
        </div>

        <div className="space-y-2">
          <Row label="Categoría" value={cat.label} />
          <Row label="Proveedor" value={supplier ?? "—"} />
          <Row label="Fecha del gasto" value={formatDay(expense.expense_date)} />
          <Row
            label="Pago"
            value={
              expense.paid_at
                ? `Pagado · ${formatDateTime(expense.paid_at)}`
                : "Pendiente de pago"
            }
          />
          <Row
            label="Registró"
            value={expense.creator?.full_name ?? expense.creator?.email ?? "—"}
          />
          {expense.notes ? (
            <div className="pt-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Notas</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{expense.notes}</p>
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Comprobante</p>
          {!expense.receipt_path ? (
            <p className="text-sm text-muted-foreground">Sin comprobante adjunto.</p>
          ) : !receiptQ.data ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : isImage ? (
            <div className="flex items-center gap-3">
              <button type="button" onClick={() => setZoom(true)}>
                <img src={receiptQ.data} alt="Comprobante" className="h-20 w-20 rounded-lg object-cover" />
              </button>
              <a
                href={receiptQ.data}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-2"
              >
                <Download className="h-4 w-4" /> Descargar
              </a>
            </div>
          ) : (
            <a
              href={receiptQ.data}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm text-foreground hover:bg-white/[0.04]"
            >
              <FileText className="h-4 w-4 text-primary" /> Ver comprobante (PDF)
            </a>
          )}
        </div>

        {expense.request_id ? (
          <div className="glass space-y-1 p-3 text-sm">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Solicitud de origen</p>
            <p className="text-foreground">{requestQ.data?.title ?? "Solicitud"}</p>
            <p className="text-xs text-muted-foreground">
              Solicitó {requestQ.data?.requester?.full_name ?? requestQ.data?.requester?.email ?? "—"}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={() =>
                navigate({
                  to: "/m/solicitudes",
                  search: { open: expense.request_id! },
                })
              }
            >
              <ExternalLink className="mr-2 h-4 w-4" /> Ver solicitud
            </Button>
          </div>
        ) : null}
      </DetailSheet>

      <Dialog open={zoom} onOpenChange={setZoom}>
        <DialogContent className="max-w-3xl border-white/10 bg-background p-2">
          {receiptQ.data ? (
            <img src={receiptQ.data} alt="Comprobante" className="max-h-[80vh] w-full object-contain" />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/40 pb-2">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-right text-sm text-foreground">{value}</span>
    </div>
  );
}
