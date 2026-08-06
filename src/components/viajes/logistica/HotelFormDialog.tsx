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
import { toLocalInputValue, fromLocalInputValue } from "@/lib/calendar-utils";
import { useHotelMutations, type HotelInput, type TripHotel } from "@/hooks/useTripHotels";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripId: string;
  userId: string;
  hotel?: TripHotel | null;
}

export function HotelFormDialog({ open, onOpenChange, tripId, userId, hotel }: Props) {
  const isEdit = !!hotel;
  const { saveHotel, removeHotel } = useHotelMutations(tripId);

  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [checkIn, setCheckIn] = React.useState("");
  const [checkOut, setCheckOut] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setName(hotel?.name ?? "");
    setAddress(hotel?.address ?? "");
    setCheckIn(hotel?.check_in_at ? toLocalInputValue(hotel.check_in_at) : "");
    setCheckOut(hotel?.check_out_at ? toLocalInputValue(hotel.check_out_at) : "");
    setPhone(hotel?.phone ?? "");
    setNotes(hotel?.notes ?? "");
  }, [open, hotel]);

  const submit = () => {
    if (!name.trim()) return toast.error("El nombre del hotel es obligatorio");
    if (!checkIn) return toast.error("La fecha de entrada es obligatoria");
    if (checkOut && new Date(checkOut) < new Date(checkIn)) {
      return toast.error("La salida no puede ser antes de la entrada");
    }
    const input: HotelInput = {
      name: name.trim(),
      address: address.trim() || null,
      check_in_at: fromLocalInputValue(checkIn),
      check_out_at: checkOut ? fromLocalInputValue(checkOut) : null,
      phone: phone.trim() || null,
      notes: notes.trim() || null,
    };
    saveHotel.mutate(
      { id: hotel?.id, input, userId },
      {
        onSuccess: () => {
          toast.success(isEdit ? "Hotel actualizado" : "Hotel agregado");
          onOpenChange(false);
        },
        onError: (e: any) => toast.error(e.message ?? "No se pudo guardar el hotel"),
      },
    );
  };

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar hotel" : "Nuevo hotel"}</EntitySheetTitle>
        <EntitySheetDescription>Hospedaje del viaje. La rooming list se arma por cuartos.</EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-1.5">
          <Label htmlFor="h-name">Nombre *</Label>
          <Input id="h-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Hotel Centro" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="h-address">Dirección</Label>
          <Input id="h-address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="h-in">Entrada *</Label>
            <Input id="h-in" type="datetime-local" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="h-out">Salida</Label>
            <Input id="h-out" type="datetime-local" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="h-phone">Teléfono</Label>
          <Input id="h-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="h-notes">Notas</Label>
          <Textarea id="h-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {isEdit ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (!hotel) return;
              removeHotel.mutate(hotel.id, {
                onSuccess: () => {
                  toast.success("Hotel eliminado");
                  onOpenChange(false);
                },
                onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
              });
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Eliminar hotel
          </Button>
        ) : null}
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" className="glow-primary" disabled={saveHotel.isPending} onClick={submit}>
          {isEdit ? "Guardar cambios" : "Agregar hotel"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
