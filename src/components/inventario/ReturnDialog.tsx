import * as React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { loanOutstanding, type LoanRow } from "@/hooks/useInventory";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  loan: LoanRow | null;
}

export function ReturnDialog({ open, onOpenChange, clubId, loan }: Props) {
  const qc = useQueryClient();
  const pending = loan ? loanOutstanding(loan) : 0;
  const [qty, setQty] = React.useState("0");

  React.useEffect(() => {
    if (!open || !loan) return;
    setQty(String(loanOutstanding(loan)));
  }, [open, loan]);

  const qtyN = Number(qty);
  const invalid = !Number.isFinite(qtyN) || qtyN < 1 || qtyN > pending;

  const mutation = useMutation({
    mutationFn: async () => {
      if (!loan) return;
      if (invalid) throw new Error(`Debes devolver entre 1 y ${pending}`);
      const { error } = await supabase
        .from("inventory_loans")
        .update({ returned_quantity: loan.returned_quantity + Math.round(qtyN) })
        .eq("id", loan.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Devolución registrada");
      qc.invalidateQueries({ queryKey: ["inventory-loans", clubId] });
      qc.invalidateQueries({ queryKey: ["inventory-catalog", clubId] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo registrar la devolución"),
  });

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="md">
      <EntitySheetHeader>
        <EntitySheetTitle>Registrar devolución</EntitySheetTitle>
        <EntitySheetDescription>
          {loan?.item?.name ?? "Artículo"} · salieron {loan?.quantity ?? 0}, pendientes {pending}
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-1.5">
          <Label htmlFor="ret-qty">¿Cuántas piezas regresan?</Label>
          <Input
            id="ret-qty"
            type="number"
            min={1}
            max={pending}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Puedes registrar una devolución parcial; el saldo restante seguirá visible como pendiente.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setQty(String(pending))}>
            Devolver todo ({pending})
          </Button>
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending || invalid}>
          Registrar devolución
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
