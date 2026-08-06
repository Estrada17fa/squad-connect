import * as React from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InventoryItemPicker } from "@/components/solicitudes/InventoryItemPicker";
import type { InventoryCatalogItem } from "@/hooks/useInventory";
import { personLabel, type MiniProfile } from "@/lib/tripLogistics";
import {
  materialOutstanding,
  useTripMaterialMutations,
  type TripMaterialLoan,
} from "@/hooks/useTripMaterial";
import { toLocalInputValue, fromLocalInputValue } from "@/lib/calendar-utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripId: string;
  clubId: string;
  teamId: string | null;
  userId: string;
  /** Fecha de regreso del viaje: devolución esperada por defecto. */
  defaultReturnAt: string | null;
  loan?: TripMaterialLoan | null;
  travelers: { user_id: string; profile: MiniProfile | null }[];
}

/** Alta y edición de material de inventario que sale con el viaje (genera préstamo). */
export function TripMaterialDialog({
  open,
  onOpenChange,
  tripId,
  clubId,
  teamId,
  userId,
  defaultReturnAt,
  loan,
  travelers,
}: Props) {
  const isEdit = !!loan;
  const { create, update, remove } = useTripMaterialMutations(tripId, clubId);

  const [item, setItem] = React.useState<InventoryCatalogItem | null>(null);
  const [itemId, setItemId] = React.useState<string | null>(null);
  const [itemName, setItemName] = React.useState("");
  const [quantity, setQuantity] = React.useState("1");
  const [responsible, setResponsible] = React.useState("");
  const [returnAt, setReturnAt] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setItem(null);
    setItemId(loan?.item_id ?? null);
    setItemName(loan?.item?.name ?? "");
    setQuantity(loan ? String(loan.quantity) : "1");
    setResponsible(loan?.borrower_user_id ?? travelers[0]?.user_id ?? "");
    setReturnAt(
      loan?.expected_return_at
        ? toLocalInputValue(loan.expected_return_at)
        : defaultReturnAt
          ? toLocalInputValue(defaultReturnAt)
          : "",
    );
    setNotes(loan?.notes ?? "");
  }, [open, loan, defaultReturnAt, travelers]);

  const available = item?.available_quantity ?? null;

  const submit = () => {
    if (!itemId) return toast.error("Elige un artículo del inventario");
    if (!responsible) return toast.error("Elige al responsable del material");
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 1) return toast.error("Cantidad inválida");
    if (!isEdit && available != null && qty > available) {
      return toast.error(`Solo hay ${available} disponibles`);
    }

    const input = {
      item_id: itemId,
      borrower_user_id: responsible,
      quantity: Math.round(qty),
      expected_return_at: returnAt ? fromLocalInputValue(returnAt) : null,
      notes: notes.trim() || null,
    };

    const done = {
      onSuccess: () => {
        toast.success(isEdit ? "Material actualizado" : "Material agregado al viaje");
        onOpenChange(false);
      },
      onError: (e: any) => toast.error(e.message ?? "No se pudo guardar el material"),
    };

    if (isEdit && loan) update.mutate({ id: loan.id, input }, done);
    else create.mutate({ input, userId, teamId }, done);
  };

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar material" : "Material del inventario"}</EntitySheetTitle>
        <EntitySheetDescription>
          Al guardar se genera un préstamo del inventario del club y baja la disponibilidad.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-1.5">
          <Label>Artículo *</Label>
          <InventoryItemPicker
            clubId={clubId}
            itemId={itemId}
            itemName={itemName}
            onChange={(i) => {
              setItem(i);
              setItemId(i?.id ?? null);
              setItemName(i?.name ?? "");
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="m-qty">Cantidad *</Label>
          <Input id="m-qty" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          {available != null ? (
            <p className="text-xs text-muted-foreground">{available} disponibles ahora mismo.</p>
          ) : null}
          {isEdit && loan ? (
            <p className="text-xs text-muted-foreground">
              Devueltas {loan.returned_quantity} · pendientes {materialOutstanding(loan)}
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label>Responsable *</Label>
          <Select value={responsible} onValueChange={setResponsible}>
            <SelectTrigger>
              <SelectValue placeholder="Elige un convocado" />
            </SelectTrigger>
            <SelectContent>
              {travelers.map((t) => (
                <SelectItem key={t.user_id} value={t.user_id}>
                  {personLabel(t.profile)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {travelers.length === 0 ? (
            <p className="text-xs text-muted-foreground">Agrega convocados al viaje para asignar responsables.</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="m-ret">Devolución esperada</Label>
          <Input id="m-ret" type="datetime-local" value={returnAt} onChange={(e) => setReturnAt(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="m-notes">Notas</Label>
          <Textarea id="m-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {isEdit && loan ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() =>
              remove.mutate(loan.id, {
                onSuccess: () => {
                  toast.success("Material retirado del viaje");
                  onOpenChange(false);
                },
                onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
              })
            }
          >
            <Trash2 className="mr-2 h-4 w-4" /> Quitar del viaje
          </Button>
        ) : null}
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button
          type="button"
          className="glow-primary"
          disabled={create.isPending || update.isPending}
          onClick={submit}
        >
          {isEdit ? "Guardar cambios" : "Agregar material"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
