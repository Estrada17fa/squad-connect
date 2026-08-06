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
import { toLocalInputValue, fromLocalInputValue } from "@/lib/calendar-utils";
import { LEG_LABEL, LEG_ORDER, type TripLeg } from "@/lib/tripLogistics";
import { useFlightMutations, type FlightInput, type TripFlight } from "@/hooks/useTripFlights";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripId: string;
  userId: string;
  flight?: TripFlight | null;
  defaultLeg?: TripLeg;
}

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

  React.useEffect(() => {
    if (!open) return;
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

  const submit = () => {
    if (!code.trim()) return toast.error("El número de vuelo es obligatorio");
    if (!departsAt) return toast.error("La fecha y hora de salida son obligatorias");
    if (!origin.trim() || !destination.trim()) return toast.error("Origen y destino son obligatorios");
    if (arrivesAt && new Date(arrivesAt) < new Date(departsAt)) {
      return toast.error("La llegada no puede ser antes de la salida");
    }
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
        onError: (e: any) => toast.error(e.message ?? "No se pudo guardar el vuelo"),
      },
    );
  };

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar vuelo" : "Nuevo vuelo"}</EntitySheetTitle>
        <EntitySheetDescription>Datos del vuelo para el itinerario del viaje.</EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-1.5">
          <Label>Tramo</Label>
          <Select value={leg} onValueChange={(v) => setLeg(v as TripLeg)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LEG_ORDER.map((l) => (
                <SelectItem key={l} value={l}>
                  {LEG_LABEL[l]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="f-code">Vuelo *</Label>
            <Input id="f-code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="AM 123" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-airline">Aerolínea</Label>
            <Input id="f-airline" value={airline} onChange={(e) => setAirline(e.target.value)} placeholder="Aeroméxico" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="f-origin">Origen *</Label>
            <Input id="f-origin" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="SJD" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-dest">Destino *</Label>
            <Input id="f-dest" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="MEX" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="f-dep">Sale *</Label>
            <Input id="f-dep" type="datetime-local" value={departsAt} onChange={(e) => setDepartsAt(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="f-arr">Llega</Label>
            <Input id="f-arr" type="datetime-local" value={arrivesAt} onChange={(e) => setArrivesAt(e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="f-gate">Puerta / sala</Label>
          <Input id="f-gate" value={gate} onChange={(e) => setGate(e.target.value)} placeholder="B7" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="f-notes">Notas</Label>
          <Textarea id="f-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {isEdit ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (!flight) return;
              remove.mutate(flight.id, {
                onSuccess: () => {
                  toast.success("Vuelo eliminado");
                  onOpenChange(false);
                },
                onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
              });
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Eliminar vuelo
          </Button>
        ) : null}
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" className="glow-primary" disabled={save.isPending} onClick={submit}>
          {isEdit ? "Guardar cambios" : "Agregar vuelo"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
