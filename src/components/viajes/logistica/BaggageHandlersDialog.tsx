import * as React from "react";
import { toast } from "sonner";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { personLabel, type MiniProfile } from "@/lib/tripLogistics";
import { useFlightMutations, type TripFlight } from "@/hooks/useTripFlights";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripId: string;
  flight: TripFlight;
}

/**
 * Quién documenta (factura) las maletas del equipo en un vuelo.
 * Solo se puede elegir entre los pasajeros ya asignados a ese vuelo.
 */
export function BaggageHandlersDialog({ open, onOpenChange, tripId, flight }: Props) {
  const { setBaggageHandlers } = useFlightMutations(tripId);
  const [selected, setSelected] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!open) return;
    const next: Record<string, string> = {};
    for (const h of flight.baggage_handlers) next[h.user_id] = h.pieces != null ? String(h.pieces) : "";
    setSelected(next);
  }, [open, flight.baggage_handlers]);

  const toggle = (userId: string) =>
    setSelected((prev) => {
      const copy = { ...prev };
      if (userId in copy) delete copy[userId];
      else copy[userId] = "";
      return copy;
    });

  const submit = () => {
    const next = Object.entries(selected).map(([user_id, pieces]) => ({
      user_id,
      pieces: pieces.trim() === "" ? null : Number(pieces),
    }));
    if (next.some((n) => n.pieces != null && (!Number.isFinite(n.pieces) || n.pieces! < 1))) {
      return toast.error("Las piezas deben ser un número mayor a cero");
    }
    setBaggageHandlers.mutate(
      { flightId: flight.id, current: flight.baggage_handlers, next },
      {
        onSuccess: () => {
          toast.success("Responsables de equipaje actualizados");
          onOpenChange(false);
        },
        onError: (e: any) => toast.error(e.message ?? "No se pudo guardar"),
      },
    );
  };

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
      <EntitySheetHeader>
        <EntitySheetTitle>Documentación de maletas · {flight.flight_code}</EntitySheetTitle>
        <EntitySheetDescription>
          Marca quién factura las maletas del equipo en este vuelo. Solo aparecen los pasajeros asignados.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        {flight.passengers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Asigna pasajeros al vuelo primero.</p>
        ) : (
          flight.passengers.map((p) => {
            const checked = p.user_id in selected;
            return (
              <div key={p.id} className="glass flex items-center gap-3 p-3">
                <Checkbox checked={checked} onCheckedChange={() => toggle(p.user_id)} />
                <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                  {personLabel(p.profile as MiniProfile | null)}
                </span>
                {checked ? (
                  <Input
                    type="number"
                    min={1}
                    placeholder="Piezas"
                    className="w-24"
                    value={selected[p.user_id] ?? ""}
                    onChange={(e) => setSelected((prev) => ({ ...prev, [p.user_id]: e.target.value }))}
                  />
                ) : null}
              </div>
            );
          })
        )}
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" className="glow-primary" disabled={setBaggageHandlers.isPending} onClick={submit}>
          Guardar
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
