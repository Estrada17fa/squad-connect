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
import { personLabel, type MiniProfile } from "@/lib/tripLogistics";
import { useLuggageMutations, type LuggageInput, type TripLuggage } from "@/hooks/useTripLuggage";

const NONE = "__none__";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripId: string;
  userId: string;
  item?: TripLuggage | null;
  /** Convocados del viaje: solo ellos pueden ser responsables. */
  travelers: { user_id: string; profile: MiniProfile | null }[];
}

export function LuggageFormDialog({ open, onOpenChange, tripId, userId, item, travelers }: Props) {
  const isEdit = !!item;
  const { save, remove } = useLuggageMutations(tripId);

  const [description, setDescription] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [responsible, setResponsible] = React.useState<string>(NONE);
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setDescription(item?.description ?? "");
    setQuantity(item?.quantity != null ? String(item.quantity) : "");
    setResponsible(item?.responsible_user_id ?? NONE);
    setNotes(item?.notes ?? "");
  }, [open, item]);

  const submit = () => {
    if (!description.trim()) return toast.error("La descripción es obligatoria");
    const qty = quantity.trim() ? Number(quantity) : null;
    if (qty != null && (!Number.isFinite(qty) || qty <= 0)) return toast.error("Cantidad inválida");
    const input: LuggageInput = {
      description: description.trim(),
      quantity: qty,
      responsible_user_id: responsible === NONE ? null : responsible,
      notes: notes.trim() || null,
    };
    save.mutate(
      { id: item?.id, input, userId },
      {
        onSuccess: () => {
          toast.success(isEdit ? "Equipaje actualizado" : "Equipaje agregado");
          onOpenChange(false);
        },
        onError: (e: any) => toast.error(e.message ?? "No se pudo guardar el equipaje"),
      },
    );
  };

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="md">
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar equipaje" : "Nuevo equipaje"}</EntitySheetTitle>
        <EntitySheetDescription>Material que viaja con el equipo y quién lo lleva.</EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-1.5">
          <Label htmlFor="l-desc">Descripción *</Label>
          <Input
            id="l-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Bolsa de balones"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="l-qty">Cantidad</Label>
          <Input id="l-qty" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Responsable</Label>
          <Select value={responsible} onValueChange={setResponsible}>
            <SelectTrigger>
              <SelectValue placeholder="Sin responsable" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>Sin responsable</SelectItem>
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
          <Label htmlFor="l-notes">Notas</Label>
          <Textarea id="l-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {isEdit ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() =>
              item &&
              remove.mutate(item.id, {
                onSuccess: () => {
                  toast.success("Equipaje eliminado");
                  onOpenChange(false);
                },
                onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
              })
            }
          >
            <Trash2 className="mr-2 h-4 w-4" /> Eliminar
          </Button>
        ) : null}
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" className="glow-primary" disabled={save.isPending} onClick={submit}>
          {isEdit ? "Guardar cambios" : "Agregar equipaje"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
