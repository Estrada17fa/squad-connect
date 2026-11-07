import * as React from "react";
import { toast } from "sonner";
import { toLocalInputValue, fromLocalInputValue } from "@/lib/calendar-utils";
import {
  LEG_LABEL,
  TRANSPORT_TYPE_LABEL,
  TRANSPORT_TYPE_ORDER,
  type TripLeg,
  type TripTransportType,
} from "@/lib/tripLogistics";
import { DateTimeField, Field, FormSection, MoreMenu, SegmentedField, TextArea, TextField, TripSheet } from "@/components/coord/viajes/form";
import { LocationPicker } from "@/components/calendar/LocationPicker";
import { useTransportMutations, type TransportInput, type TripTransport } from "@/hooks/useTripTransports";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripId: string;
  clubId: string;
  userId: string;
  transport?: TripTransport | null;
  defaultLeg?: TripLeg;
}

export function TransportFormDialog({ open, onOpenChange, tripId, clubId, userId, transport, defaultLeg = "ida" }: Props) {
  const isEdit = !!transport;
  const { save, remove } = useTransportMutations(tripId);

  const [leg, setLeg] = React.useState<TripLeg>(defaultLeg);
  const [type, setType] = React.useState<TripTransportType>("bus");
  const [label, setLabel] = React.useState("");
  const [departsAt, setDepartsAt] = React.useState("");
  const [pickup, setPickup] = React.useState("");
  const [pickupLocationId, setPickupLocationId] = React.useState<string | null>(null);
  const [destination, setDestination] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setLeg(transport?.leg ?? defaultLeg);
    setType(transport?.transport_type ?? "bus");
    setLabel(transport?.label ?? "");
    setDepartsAt(transport?.departs_at ? toLocalInputValue(transport.departs_at) : "");
    setPickup(transport?.pickup_location ?? "");
    setPickupLocationId(transport?.pickup_location_id ?? null);
    setDestination(transport?.destination ?? "");
    setNotes(transport?.notes ?? "");
  }, [open, transport, defaultLeg]);

  const submit = () => {
    if (!departsAt) return toast.error("La hora de salida es obligatoria");
    if (!pickup.trim() || !destination.trim()) return toast.error("Punto de encuentro y destino son obligatorios");
    const input: TransportInput = {
      leg,
      transport_type: type,
      label: label.trim() || null,
      departs_at: fromLocalInputValue(departsAt),
      pickup_location: pickup.trim(),
      pickup_location_id: pickupLocationId,
      destination: destination.trim(),
      notes: notes.trim() || null,
    };
    save.mutate(
      { id: transport?.id, input, userId },
      {
        onSuccess: () => {
          toast.success(isEdit ? "Transporte actualizado" : "Transporte agregado");
          onOpenChange(false);
        },
        onError: (e: any) => toast.error(e.message ?? "No se pudo guardar el transporte"),
      },
    );
  };

  const del = () => {
    if (!transport) return;
    remove.mutate(transport.id, {
      onSuccess: () => { toast.success("Transporte eliminado"); onOpenChange(false); },
      onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
    });
  };

  return (
    <TripSheet open={open} onOpenChange={onOpenChange} title={isEdit ? "Editar transporte" : "Nuevo transporte"}
      menu={isEdit ? <MoreMenu onDelete={del} deleteLabel="Eliminar transporte" deleting={remove.isPending} /> : null}
      primary={{ label: isEdit ? "Guardar cambios" : "Agregar transporte", onClick: submit, loading: save.isPending }}>
      <Field label="Tramo"><SegmentedField items={[{ key: "ida" as TripLeg, label: LEG_LABEL.ida }, { key: "regreso" as TripLeg, label: LEG_LABEL.regreso }]} value={leg} onChange={setLeg} /></Field>
      <Field label="Tipo"><SegmentedField items={TRANSPORT_TYPE_ORDER.map((t) => ({ key: t, label: TRANSPORT_TYPE_LABEL[t] }))} value={type} onChange={setType} /></Field>
      <Field label="Unidad"><TextField value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Unidad 1" /></Field>
      <Field label="Sale"><DateTimeField value={departsAt} onChange={setDepartsAt} /></Field>
      <FormSection>
        <LocationPicker id="t-pickup" label="Punto de encuentro" placeholder="Estadio, Don Koll…" clubId={clubId} userId={userId}
          value={pickup} onChange={setPickup} locationId={pickupLocationId} onLocationIdChange={setPickupLocationId} />
        <Field label="Destino"><TextField value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Aeropuerto SJD" /></Field>
      </FormSection>
      <Field label="Notas"><TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
    </TripSheet>
  );
}
