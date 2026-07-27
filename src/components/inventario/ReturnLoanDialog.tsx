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
import type { InventoryLoan } from "@/hooks/useInventory";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  loan: InventoryLoan | null;
}

export function ReturnLoanDialog({ open, onOpenChange, clubId, loan }: Props) {
  const qc = useQueryClient();
  const pending = loan ? loan.quantity - loan.returned_quantity : 0;
  const [amount, setAmount] = React.useState<string>("");

  React.useEffect(() => {
    if (!open || !loan) return;
    setAmount(String(pending));
  }, [open, loan, pending]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!loan) return;
      const n = Number(amount);
      if (!Number.isFinite(n) || n <= 0) throw new Error("Cantidad inválida");
      if (n > pending) throw new Error(`Solo faltan ${pending} por devolver`);
      const newReturned = loan.returned_quantity + n;
      const { error } = await supabase
        .from("inventory_loans")
        .update({ returned_quantity: newReturned })
        .eq("id", loan.id);
      if (error) throw error;
      return newReturned >= loan.quantity;
    },
    onSuccess: (fullyReturned) => {
      toast.success(fullyReturned ? "Préstamo cerrado" : "Devolución parcial registrada");
      qc.invalidateQueries({ queryKey: ["inv-loans", clubId] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message ?? "No se pudo registrar"),
  });

  if (!loan) return null;

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="md">
      <EntitySheetHeader>
        <EntitySheetTitle>Registrar devolución</EntitySheetTitle>
        <EntitySheetDescription>
          {loan.item?.name ?? "Artículo"} · Prestados {loan.quantity}, devueltos {loan.returned_quantity}
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-1.5">
          <Label htmlFor="r-amt">Cantidad devuelta ahora</Label>
          <Input
            id="r-amt"
            type="number"
            inputMode="numeric"
            min={1}
            max={pending}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Pendientes por devolver: <span className="text-foreground">{pending}</span>
          </p>
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
        <Button type="button" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          Registrar devolución
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
