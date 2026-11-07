import * as React from "react";
import { toast } from "sonner";
import { toLocalInputValue, fromLocalInputValue } from "@/lib/calendar-utils";
import { LEG_LABEL, type TripLeg } from "@/lib/tripLogistics";
import { useFlightMutations, type FlightInput, type TripFlight } from "@/hooks/useTripFlights";
import { DateTimeField, Field, FormError, FormSection, MoreMenu, SegmentedField, TextArea, TextField, TripSheet } from "@/components/coord/viajes/form";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripId: string;
  userId: string;
  flight?: TripFlight | null;
  defaultLeg?: TripLeg;
}

const LEGS: { key: TripLeg; label: string }[] = [{ key: "ida", label: LEG_LABEL.ida }, { key: "regreso", label: LEG_LABEL.regreso }];

export function FlightFormDialog({ open, onOpenChange, tripId, userId, flight, defaultLeg = "ida" }: Props) {
  const isEdit = !!flight;
  const { save, remove } = useFlightMutations(tripId);

  const [leg, setLeg] = React.useState<TripLeg>(defaultLeg);
  const [code, setCode] = React.useState("");
  const [airline, setAirline] = React.useState("");
  const [departsAt, setDepartsAt] = React.useState("");
  const [arrivesAt, setArrivesAt] = React.useState("");
  const [origin, setOrigin] = React.useState("");
  const [destination, setDestination] = React.useState("");
  const [gate, setGate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [baggage, setBaggage] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setLeg(flight?.leg ?? defaultLeg);
    setCode(flight?.flight_code ?? "");
    setAirline(flight?.airline ?? "");
    setDepartsAt(flight?.departs_at ? toLocalInputValue(flight.departs_at) : "");
    setArrivesAt(flight?.arrives_at ? toLocalInputValue(flight.arrives_at) : "");
    setOrigin(flight?.origin ?? "");
    setDestination(flight?.destination ?? "");
    setGate(flight?.gate ?? "");
    setNotes(flight?.notes ?? "");
    setBaggage(flight?.baggage_instructions ?? "");
  }, [open, flight, defaultLeg]);

  const fail = (msg: string) => {
    setError(msg);
    toast.error(msg);
  };

  const submit = () => {
    setError(null);
    if (!code.trim()) return fail("El número de vuelo es obligatorio");
    if (!departsAt) return fail("La fecha y hora de salida son obligatorias");
    if (!origin.trim() || !destination.trim()) return fail("Origen y destino son obligatorios");
    if (arrivesAt && new Date(arrivesAt) < new Date(departsAt)) return fail("La llegada no puede ser antes de la salida");
    const input: FlightInput = {
      leg,
      flight_code: code.trim(),
      airline: airline.trim() || null,
      departs_at: fromLocalInputValue(departsAt),
      arrives_at: arrivesAt ? fromLocalInputValue(arrivesAt) : null,
      origin: origin.trim(),
      destination: destination.trim(),
      gate: gate.trim() || null,
      notes: notes.trim() || null,
      baggage_instructions: baggage.trim() || null,
    };
    save.mutate(
      { id: flight?.id, input, userId },
      {
        onSuccess: () => {
          toast.success(isEdit ? "Vuelo actualizado" : "Vuelo agregado");
          onOpenChange(false);
        },
        onError: (e: any) => fail(e.message ?? "No se pudo guardar el vuelo"),
      },
    );
  };

  const del = () => {
    if (!flight) return;
    remove.mutate(flight.id, {
      onSuccess: () => { toast.success("Vuelo eliminado"); onOpenChange(false); },
      onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
    });
  };

  return (
    <TripSheet open={open} onOpenChange={onOpenChange} title={isEdit ? "Editar vuelo" : "Nuevo vuelo"}
      menu={isEdit ? <MoreMenu onDelete={del} deleteLabel="Eliminar vuelo" confirmTitle={`¿Eliminar el vuelo ${flight?.flight_code}?`} confirmDescription="Se borrarán sus pasajeros, equipaje y pases de abordar." deleting={remove.isPending} /> : null}
      primary={{ label: isEdit ? "Guardar cambios" : "Agregar vuelo", onClick: submit, loading: save.isPending }}>
      <FormError>{error}</FormError>
      <Field label="Tramo"><SegmentedField items={LEGS} value={leg} onChange={setLeg} /></Field>
      <FormSection>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Vuelo"><TextField value={code} onChange={(e) => setCode(e.target.value)} placeholder="AM 123" /></Field>
          <Field label="Aerolínea"><TextField value={airline} onChange={(e) => setAirline(e.target.value)} placeholder="Aeroméxico" /></Field>
          <Field label="Origen"><TextField value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="SJD" /></Field>
          <Field label="Destino"><TextField value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="MEX" /></Field>
        </div>
      </FormSection>
      <FormSection>
        <Field label="Sale"><DateTimeField value={departsAt} onChange={setDepartsAt} /></Field>
        <Field label="Llega"><DateTimeField value={arrivesAt} onChange={setArrivesAt} clearable placeholder="Opcional" /></Field>
        <Field label="Puerta o sala"><TextField value={gate} onChange={(e) => setGate(e.target.value)} placeholder="B7" /></Field>
      </FormSection>
      <FormSection>
        <Field label="Instrucción de equipaje"><TextArea rows={2} value={baggage} onChange={(e) => setBaggage(e.target.value)} placeholder="1 maleta de mano por persona" /></Field>
        <Field label="Notas"><TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
      </FormSection>
    </TripSheet>
  );
}
