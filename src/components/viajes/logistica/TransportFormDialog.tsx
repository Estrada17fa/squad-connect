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
import {
  LEG_LABEL,
  LEG_ORDER,
  TRANSPORT_TYPE_LABEL,
  TRANSPORT_TYPE_ORDER,
  type TripLeg,
  type TripTransportType,
} from "@/lib/tripLogistics";
import { useTransportMutations, type TransportInput, type TripTransport } from "@/hooks/useTripTransports";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripId: string;
  userId: string;
  transport?: TripTransport | null;
  defaultLeg?: TripLeg;
}

export function TransportFormDialog({ open, onOpenChange, tripId, userId, transport, defaultLeg = "ida" }: Props) {
  const isEdit = !!transport;
  const { save, remove } = useTransportMutations(tripId);

  const [leg, setLeg] = React.useState<TripLeg>(defaultLeg);
  const [type, setType] = React.useState<TripTransportType>("bus");
  const [label, setLabel] = React.useState("");
  const [departsAt, setDepartsAt] = React.useState("");
  const [pickup, setPickup] = React.useState("");
  const [destination, setDestination] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setLeg(transport?.leg ?? defaultLeg);
    setType(transport?.transport_type ?? "bus");
    setLabel(transport?.label ?? "");
    setDepartsAt(transport?.departs_at ? toLocalInputValue(transport.departs_at) : "");
    setPickup(transport?.pickup_location ?? "");
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

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar transporte" : "Nuevo transporte"}</EntitySheetTitle>
        <EntitySheetDescription>Unidad terrestre del viaje. Después asigna a quién va en ella.</EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="grid grid-cols-2 gap-3">
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
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as TripTransportType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSPORT_TYPE_ORDER.map((t) => (
                  <SelectItem key={t} value={t}>
                    {TRANSPORT_TYPE_LABEL[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="t-label">Identificador de la unidad</Label>
          <Input id="t-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Unidad 1" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="t-dep">Sale *</Label>
          <Input id="t-dep" type="datetime-local" value={departsAt} onChange={(e) => setDepartsAt(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="t-pickup">Punto de encuentro *</Label>
          <Input id="t-pickup" value={pickup} onChange={(e) => setPickup(e.target.value)} placeholder="Estadio" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="t-dest">Destino *</Label>
          <Input
            id="t-dest"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Aeropuerto SJD"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="t-notes">Notas</Label>
          <Textarea id="t-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {isEdit ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              if (!transport) return;
              remove.mutate(transport.id, {
                onSuccess: () => {
                  toast.success("Transporte eliminado");
                  onOpenChange(false);
                },
                onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
              });
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Eliminar transporte
          </Button>
        ) : null}
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" className="glow-primary" disabled={save.isPending} onClick={submit}>
          {isEdit ? "Guardar cambios" : "Agregar transporte"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
