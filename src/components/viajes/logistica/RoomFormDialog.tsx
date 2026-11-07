import * as React from "react";
import { toast } from "sonner";
import { Field, MoreMenu, TextArea, TextField, TripSheet } from "@/components/coord/viajes/form";
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

  const del = () => room && removeRoom.mutate(room.id, {
    onSuccess: () => { toast.success("Cuarto eliminado"); onOpenChange(false); },
    onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
  });

  return (
    <TripSheet open={open} onOpenChange={onOpenChange} title={isEdit ? "Editar cuarto" : "Nuevo cuarto"}
      menu={isEdit ? <MoreMenu onDelete={del} deleteLabel="Eliminar cuarto" confirmTitle={`¿Eliminar el cuarto ${room?.room_label}?`} confirmDescription="Se quitarán sus ocupantes." deleting={removeRoom.isPending} /> : null}
      primary={{ label: isEdit ? "Guardar cambios" : "Agregar cuarto", onClick: submit, loading: saveRoom.isPending }}>
      <Field label="Cuarto"><TextField value={label} onChange={(e) => setLabel(e.target.value)} placeholder="302" /></Field>
      <Field label="Notas"><TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
    </TripSheet>
  );
}
