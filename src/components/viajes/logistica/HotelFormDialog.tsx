import * as React from "react";
import { LocationPicker } from "@/components/calendar/LocationPicker";
import { toast } from "sonner";
import { DateTimeField, Field, FormSection, MoreMenu, TextArea, TextField, TripSheet } from "@/components/coord/viajes/form";
import { toLocalInputValue, fromLocalInputValue } from "@/lib/calendar-utils";
import { useHotelMutations, type HotelInput, type TripHotel } from "@/hooks/useTripHotels";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripId: string;
  clubId: string;
  userId: string;
  hotel?: TripHotel | null;
}

export function HotelFormDialog({ open, onOpenChange, tripId, clubId, userId, hotel }: Props) {
  const isEdit = !!hotel;
  const { saveHotel, removeHotel } = useHotelMutations(tripId);

  const [name, setName] = React.useState("");
  const [address, setAddress] = React.useState("");
  const [locationId, setLocationId] = React.useState<string | null>(null);
  const [checkIn, setCheckIn] = React.useState("");
  const [checkOut, setCheckOut] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setName(hotel?.name ?? "");
    setAddress(hotel?.address ?? "");
    setLocationId(((hotel as any)?.location_id as string | null) ?? null);
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
      location_id: locationId,
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

  const del = () => {
    if (!hotel) return;
    removeHotel.mutate(hotel.id, {
      onSuccess: () => { toast.success("Hotel eliminado"); onOpenChange(false); },
      onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
    });
  };

  return (
    <TripSheet open={open} onOpenChange={onOpenChange} title={isEdit ? "Editar hotel" : "Nuevo hotel"}
      menu={isEdit ? <MoreMenu onDelete={del} deleteLabel="Eliminar hotel" confirmTitle={`¿Eliminar ${hotel?.name}?`} confirmDescription="Se borrarán sus cuartos y la rooming list." deleting={removeHotel.isPending} /> : null}
      primary={{ label: isEdit ? "Guardar cambios" : "Agregar hotel", onClick: submit, loading: saveHotel.isPending }}>
      <Field label="Nombre"><TextField value={name} onChange={(e) => setName(e.target.value)} placeholder="Hotel Centro" /></Field>
      <LocationPicker id="h-address" label="Dirección" placeholder="Busca el hotel o su dirección…" clubId={clubId} userId={userId}
        value={address} onChange={setAddress} locationId={locationId} onLocationIdChange={setLocationId} />
      <FormSection>
        <Field label="Entrada"><DateTimeField value={checkIn} onChange={setCheckIn} /></Field>
        <Field label="Salida"><DateTimeField value={checkOut} onChange={setCheckOut} clearable placeholder="Opcional" /></Field>
      </FormSection>
      <Field label="Teléfono"><TextField value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" /></Field>
      <Field label="Notas"><TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
    </TripSheet>
  );
}
