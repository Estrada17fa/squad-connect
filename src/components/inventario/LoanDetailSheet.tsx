import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2, Pencil, CheckCircle2, AlertTriangle, User as UserIcon } from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { StatusBadge, type StatusVariant } from "@/components/squad/StatusBadge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatDateTime } from "@/lib/calendar-utils";
import { useInventoryImageUrl, type InventoryLoan } from "@/hooks/useInventory";
import { Package } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  loan: InventoryLoan | null;
  clubId: string;
  canEdit: boolean;
  onEdit: () => void;
  onReturn: () => void;
}

export function LoanDetailSheet({ open, onOpenChange, loan, clubId, canEdit, onEdit, onReturn }: Props) {
  const qc = useQueryClient();

  const del = useMutation({
    mutationFn: async () => {
      if (!loan) return;
      const { error } = await supabase.from("inventory_loans").delete().eq("id", loan.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Préstamo eliminado");
      qc.invalidateQueries({ queryKey: ["inv-loans", clubId] });
      qc.invalidateQueries({ queryKey: ["inv-items", clubId] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
  });

  if (!loan) return null;

  const pending = loan.quantity - loan.returned_quantity;
  const active = !loan.returned_at;
  const overdue = active && !!loan.expected_return_at && new Date(loan.expected_return_at) < new Date();
  const partial = active && loan.returned_quantity > 0;
  const status: { label: string; variant: StatusVariant } = !active
    ? { label: "Devuelto", variant: "approved" }
    : overdue
      ? { label: "Vencido", variant: "rejected" }
      : partial
        ? { label: `Parcial · faltan ${pending}`, variant: "pending" }
        : { label: `Activo · ${pending}`, variant: "info" };

  const borrower = loan.borrower?.full_name ?? loan.borrower?.email ?? "Miembro";
  const unit = loan.item?.unit ? ` ${loan.item.unit}` : "";

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange}>
      <EntitySheetHeader>
        <EntitySheetTitle>{loan.item?.name ?? "Préstamo"}</EntitySheetTitle>
        <EntitySheetDescription>Detalle del préstamo</EntitySheetDescription>
        {canEdit ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {active ? (
              <Button size="sm" variant="secondary" onClick={onReturn}>
                <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Devolver
              </Button>
            ) : null}
            <Button size="sm" variant="secondary" onClick={onEdit}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => { if (confirm("¿Eliminar este préstamo?")) del.mutate(); }}
              disabled={del.isPending}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Eliminar
            </Button>
          </div>
        ) : null}
      </EntitySheetHeader>

      <EntitySheetBody>
        <Field label="Estado">
          <div className="flex items-center gap-2">
            <StatusBadge variant={status.variant}>{status.label}</StatusBadge>
            {overdue ? (
              <span className="inline-flex items-center gap-1 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5" /> Vencido
              </span>
            ) : null}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Cantidad"><span className="text-foreground">{loan.quantity}{unit}</span></Field>
          <Field label="Devuelto"><span className="text-foreground">{loan.returned_quantity}{unit}</span></Field>
        </div>

        <Field label="Prestado a">
          <div className="flex items-center gap-2 text-sm">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[11px] font-medium">
              <UserIcon className="h-3.5 w-3.5" />
            </span>
            <span className="text-foreground">{borrower}</span>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoría"><span className="text-foreground">{loan.team?.name ?? "—"}</span></Field>
          <Field label="Evento"><span className="text-foreground">{loan.event?.title ?? "—"}</span></Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Devolución esperada">
            <span className="text-foreground">
              {loan.expected_return_at ? formatDateTime(loan.expected_return_at) : "Sin fecha"}
            </span>
          </Field>
          <Field label="Devuelto el">
            <span className="text-foreground">
              {loan.returned_at ? formatDateTime(loan.returned_at) : "—"}
            </span>
          </Field>
        </div>

        {loan.notes ? (
          <Field label="Notas">
            <p className="whitespace-pre-wrap text-sm text-foreground/90">{loan.notes}</p>
          </Field>
        ) : null}

        <div className="pt-1 text-xs text-muted-foreground">
          <div className="uppercase tracking-wider">Registrado</div>
          <div className="mt-0.5 text-foreground/80">{formatDateTime(loan.created_at)}</div>
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cerrar</Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div>{children}</div>
    </div>
  );
}
