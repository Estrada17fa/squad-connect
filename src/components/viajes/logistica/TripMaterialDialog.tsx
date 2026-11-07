import * as React from "react";
import { toast } from "sonner";
import { DateTimeField, Field, MoreMenu, TextArea, TextField, TripSheet } from "@/components/coord/viajes/form";
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

  const del = () => loan && remove.mutate(loan.id, {
    onSuccess: () => { toast.success("Material retirado del viaje"); onOpenChange(false); },
    onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
  });

  return (
    <TripSheet open={open} onOpenChange={onOpenChange} title={isEdit ? "Editar material" : "Agregar material"}
      menu={isEdit ? <MoreMenu onDelete={del} deleteLabel="Quitar del viaje" deleting={remove.isPending} /> : null}
      primary={{ label: isEdit ? "Guardar cambios" : "Agregar material", onClick: submit, loading: create.isPending || update.isPending }}>
      <div className="space-y-1.5">
        <span className="block text-xs font-semibold text-muted-foreground">Artículo</span>
        <InventoryItemPicker clubId={clubId} itemId={itemId} itemName={itemName}
          onChange={(i) => { setItem(i); setItemId(i?.id ?? null); setItemName(i?.name ?? ""); }} />
      </div>
      <Field label={available != null ? `Cantidad · ${available} disponibles` : "Cantidad"}>
        <TextField type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
      </Field>
      {isEdit && loan ? <p className="-mt-3 text-xs text-muted-foreground">Devueltas {loan.returned_quantity} · pendientes {materialOutstanding(loan)}</p> : null}
      <div className="space-y-1.5">
        <span className="block text-xs font-semibold text-muted-foreground">Responsable</span>
        <Select value={responsible} onValueChange={setResponsible}>
          <SelectTrigger className="h-11 rounded-xl border-0 bg-muted"><SelectValue placeholder="Elige un convocado" /></SelectTrigger>
          <SelectContent>
            {travelers.map((t) => <SelectItem key={t.user_id} value={t.user_id}>{personLabel(t.profile)}</SelectItem>)}
          </SelectContent>
        </Select>
        {travelers.length === 0 ? <p className="text-xs text-muted-foreground">Agrega convocados al viaje para asignar responsables.</p> : null}
      </div>
      <Field label="Devolución esperada"><DateTimeField value={returnAt} onChange={setReturnAt} clearable placeholder="Opcional" /></Field>
      <Field label="Notas"><TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
    </TripSheet>
  );
}
