import * as React from "react";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { personLabel } from "@/lib/tripLogistics";
import {
  materialOutstanding,
  useTripMaterialMutations,
  type TripMaterialLoan,
} from "@/hooks/useTripMaterial";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripId: string;
  clubId: string;
  loans: TripMaterialLoan[];
}

/** Devolución (total o parcial) del material que salió con el viaje. */
export function TripMaterialReturnDialog({ open, onOpenChange, tripId, clubId, loans }: Props) {
  const { registerReturn } = useTripMaterialMutations(tripId, clubId);
  const pendientes = loans.filter((l) => materialOutstanding(l) > 0);
  const [qty, setQty] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!open) return;
    const next: Record<string, string> = {};
    for (const l of pendientes) next[l.id] = String(materialOutstanding(l));
    setQty(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loans.length]);

  const submitOne = (loan: TripMaterialLoan) => {
    const pending = materialOutstanding(loan);
    const n = Number(qty[loan.id] ?? 0);
    if (!Number.isFinite(n) || n < 1 || n > pending) {
      return toast.error(`Debes devolver entre 1 y ${pending}`);
    }
    registerReturn.mutate(
      { loan, quantity: Math.round(n) },
      {
        onSuccess: () => toast.success(`Devolución registrada: ${loan.item?.name ?? "material"}`),
        onError: (e: any) => toast.error(e.message ?? "No se pudo registrar la devolución"),
      },
    );
  };

  const returnAll = () => {
    for (const l of pendientes) {
      registerReturn.mutate({ loan: l, quantity: materialOutstanding(l) });
    }
    toast.success("Material devuelto al inventario");
    onOpenChange(false);
  };

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
      <EntitySheetHeader>
        <EntitySheetTitle>Devolver material del viaje</EntitySheetTitle>
        <EntitySheetDescription>
          Registra el regreso total o parcial; lo devuelto vuelve a estar disponible en el inventario.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        {pendientes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Todo el material del viaje ya fue devuelto.</p>
        ) : (
          <>
            {pendientes.map((l) => {
              const pending = materialOutstanding(l);
              return (
                <div key={l.id} className="glass space-y-2 p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {l.item?.name ?? "Material"} <span className="text-muted-foreground">×{l.quantity}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Lleva: {personLabel(l.borrower)} · pendientes {pending}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={pending}
                      value={qty[l.id] ?? ""}
                      onChange={(e) => setQty((p) => ({ ...p, [l.id]: e.target.value }))}
                      className="w-24"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      disabled={registerReturn.isPending}
                      onClick={() => submitOne(l)}
                    >
                      <RotateCcw className="mr-1.5 h-4 w-4" /> Registrar
                    </Button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cerrar
        </Button>
        {pendientes.length > 0 ? (
          <Button type="button" className="glow-primary" disabled={registerReturn.isPending} onClick={returnAll}>
            Devolver todo
          </Button>
        ) : null}
      </EntitySheetFooter>
    </EntitySheet>
  );
}
