import * as React from "react";
import { toast } from "sonner";
import { FileText, Luggage, Pencil, Plane, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/calendar-utils";
import { LEG_LABEL, personLabel, type MiniProfile, type TripLeg } from "@/lib/tripLogistics";
import { useFlightMutations, type TripFlight } from "@/hooks/useTripFlights";
import { TimelineSection } from "./TimelineSection";
import { PersonChips } from "./PersonChips";
import { FlightFormDialog } from "./FlightFormDialog";
import { BoardingPassDialog } from "./BoardingPassDialog";
import { BaggageHandlersDialog } from "./BaggageHandlersDialog";
import { PassengerAssignDialog, type AssignCandidate } from "./PassengerAssignDialog";

interface Props {
  tripId: string;
  userId: string;
  leg: TripLeg;
  flights: TripFlight[];
  allFlights: TripFlight[];
  travelers: AssignCandidate[];
  canEdit: boolean;
}

export function FlightsSection({ tripId, userId, leg, flights, allFlights, travelers, canEdit }: Props) {
  const { setPassengers } = useFlightMutations(tripId);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TripFlight | null>(null);
  const [passengersFor, setPassengersFor] = React.useState<TripFlight | null>(null);
  const [passesFor, setPassesFor] = React.useState<TripFlight | null>(null);
  const [baggageFor, setBaggageFor] = React.useState<TripFlight | null>(null);


  const importSources = React.useMemo(
    () =>
      allFlights
        .filter((f) => f.id !== passengersFor?.id && f.passengers.length > 0)
        .map((f) => ({ label: `${LEG_LABEL[f.leg]} · ${f.flight_code}`, userIds: f.passengers.map((p) => p.user_id) })),
    [allFlights, passengersFor?.id],
  );

  return (
    <>
      <TimelineSection
        icon={Plane}
        title={`Vuelo ${LEG_LABEL[leg].toLowerCase()}`}
        count={flights.length}
        canEdit={canEdit}
        addLabel="Agregar vuelo"
        emptyLabel="Sin vuelos registrados."
        onAdd={() => {
          setEditing(null);
          setFormOpen(true);
        }}
      >
        {flights.map((f) => (
          <article key={f.id} className="glass space-y-2 p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {f.flight_code}
                  {f.airline ? <span className="text-muted-foreground"> · {f.airline}</span> : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {f.origin} → {f.destination}
                  {f.gate ? ` · Puerta ${f.gate}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  Sale {formatDateTime(f.departs_at)}
                  {f.arrives_at ? ` · Llega ${formatDateTime(f.arrives_at)}` : ""}
                </p>
              </div>
              {canEdit ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditing(f);
                    setFormOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : null}
            </div>

            {f.notes ? <p className="text-xs text-muted-foreground">{f.notes}</p> : null}

            {f.baggage_instructions ? (
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Luggage className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {f.baggage_instructions}
              </p>
            ) : null}

            {f.baggage_handlers.length > 0 ? (
              f.baggage_handlers.some((h) => h.user_id === userId) ? (
                <p className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
                  Tú documentas las maletas del equipo en este vuelo
                  {(() => {
                    const mine = f.baggage_handlers.find((h) => h.user_id === userId);
                    return mine?.pieces ? ` · ${mine.pieces} pieza${mine.pieces === 1 ? "" : "s"}` : "";
                  })()}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Documentan: {f.baggage_handlers.map((h) => personLabel(h.profile)).join(", ")}
                </p>
              )
            ) : null}

            <PersonChips
              people={f.passengers.map((p) => ({ id: p.id, profile: p.profile as MiniProfile | null }))}
              emptyLabel="Sin pasajeros asignados"
            />

            {canEdit ? (
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => setPassengersFor(f)}>
                  <Users className="mr-1.5 h-4 w-4" /> Pasajeros
                </Button>
                <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => setPassesFor(f)}>
                  <FileText className="mr-1.5 h-4 w-4" /> Pases ({f.boarding_passes.length})
                </Button>
                <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => setBaggageFor(f)}>
                  <Luggage className="mr-1.5 h-4 w-4" /> Documentan maletas ({f.baggage_handlers.length})
                </Button>
              </div>
            ) : null}
          </article>
        ))}
      </TimelineSection>


      {canEdit ? (
        <FlightFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          tripId={tripId}
          userId={userId}
          flight={editing}
          defaultLeg={leg}
        />
      ) : null}

      {canEdit && passengersFor ? (
        <PassengerAssignDialog
          open
          onOpenChange={(v) => !v && setPassengersFor(null)}
          title={`Pasajeros · ${passengersFor.flight_code}`}
          candidates={travelers}
          selectedIds={passengersFor.passengers.map((p) => p.user_id)}
          importSources={importSources}
          saving={setPassengers.isPending}
          onSave={(ids) =>
            setPassengers.mutate(
              {
                flightId: passengersFor.id,
                current: passengersFor.passengers.map((p) => p.user_id),
                next: ids,
              },
              {
                onSuccess: () => {
                  toast.success("Pasajeros actualizados");
                  setPassengersFor(null);
                },
                onError: (e: any) => toast.error(e.message ?? "No se pudo guardar"),
              },
            )
          }
        />
      ) : null}

      {canEdit && passesFor ? (
        <BoardingPassDialog
          open
          onOpenChange={(v) => !v && setPassesFor(null)}
          tripId={tripId}
          flight={allFlights.find((f) => f.id === passesFor.id) ?? passesFor}
        />
      ) : null}
    </>
  );
}
