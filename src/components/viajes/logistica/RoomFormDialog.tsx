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
import { useHotelMutations, type TripRoom } from "@/hooks/useTripHotels";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripId: string;
  hotelId: string;
  room?: TripRoom | null;
}

export function RoomFormDialog({ open, onOpenChange, tripId, hotelId, room }: Props) {
  const isEdit = !!room;
  const { saveRoom, removeRoom } = useHotelMutations(tripId);
  const [label, setLabel] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setLabel(room?.room_label ?? "");
    setNotes(room?.notes ?? "");
  }, [open, room]);

  const submit = () => {
    if (!label.trim()) return toast.error("El número o nombre del cuarto es obligatorio");
    saveRoom.mutate(
      { id: room?.id, hotelId, input: { room_label: label.trim(), notes: notes.trim() || null } },
      {
        onSuccess: () => {
          toast.success(isEdit ? "Cuarto actualizado" : "Cuarto agregado");
          onOpenChange(false);
        },
        onError: (e: any) => toast.error(e.message ?? "No se pudo guardar el cuarto"),
      },
    );
  };

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="md">
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar cuarto" : "Nuevo cuarto"}</EntitySheetTitle>
        <EntitySheetDescription>Después asigna quién duerme en él.</EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-1.5">
          <Label htmlFor="r-label">Cuarto *</Label>
          <Input id="r-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="302" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-notes">Notas</Label>
          <Textarea id="r-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {isEdit ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() =>
              room &&
              removeRoom.mutate(room.id, {
                onSuccess: () => {
                  toast.success("Cuarto eliminado");
                  onOpenChange(false);
                },
                onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
              })
            }
          >
            <Trash2 className="mr-2 h-4 w-4" /> Eliminar cuarto
          </Button>
        ) : null}
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" className="glow-primary" disabled={saveRoom.isPending} onClick={submit}>
          {isEdit ? "Guardar cambios" : "Agregar cuarto"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
