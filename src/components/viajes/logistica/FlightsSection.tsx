import * as React from "react";
import { Luggage, Plane } from "lucide-react";
import { formatDateTime } from "@/lib/calendar-utils";
import { LEG_LABEL, personLabel, type MiniProfile, type TripLeg } from "@/lib/tripLogistics";
import { type TripFlight } from "@/hooks/useTripFlights";
import { TimelineSection } from "./TimelineSection";
import { PersonChips } from "./PersonChips";
import { FlightFormDialog } from "./FlightFormDialog";
import { FlightDetailSheet } from "./FlightDetailSheet";
import { type AssignCandidate } from "./PassengerAssignDialog";

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
  const [formOpen, setFormOpen] = React.useState(false);
  const [detailFor, setDetailFor] = React.useState<TripFlight | null>(null);

  return (
    <>
      <TimelineSection
        icon={Plane}
        title={`Vuelo ${LEG_LABEL[leg].toLowerCase()}`}
        count={flights.length}
        canEdit={canEdit}
        addLabel="Agregar vuelo"
        emptyLabel="Sin vuelos registrados."
        onAdd={() => setFormOpen(true)}
      >
        {flights.map((f) => (
          <button
            key={f.id}
            type="button"
            className="glass w-full space-y-2 p-3 text-left transition-colors hover:bg-white/[0.04]"
            onClick={() => setDetailFor(f)}
          >
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
              <p className="text-xs text-primary">
                {f.passengers.length} pasajero{f.passengers.length === 1 ? "" : "s"}
                {f.passengers.length > 0
                  ? ` · ${f.passengers.filter((p) => f.boarding_passes.some((bp) => bp.user_id === p.user_id)).length} con pase`
                  : ""}
              </p>
            </div>

            {f.baggage_handlers.filter((h) => h.checked_bag).length > 0 ? (
              f.baggage_handlers.some((h) => h.checked_bag && h.user_id === userId) ? (
                <p className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
                  Tú documentas las maletas del equipo en este vuelo
                </p>
              ) : (
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Luggage className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Documentan:{" "}
                  {f.baggage_handlers.filter((h) => h.checked_bag).map((h) => personLabel(h.profile)).join(", ")}
                </p>
              )
            ) : null}


            <PersonChips
              people={f.passengers.map((p) => ({ id: p.id, profile: p.profile as MiniProfile | null }))}
              emptyLabel="Sin pasajeros asignados"
            />
          </button>
        ))}
      </TimelineSection>

      {canEdit ? (
        <FlightFormDialog open={formOpen} onOpenChange={setFormOpen} tripId={tripId} userId={userId} flight={null} defaultLeg={leg} />
      ) : null}

      <FlightDetailSheet
        open={!!detailFor}
        onOpenChange={(v) => !v && setDetailFor(null)}
        flight={detailFor}
        allFlights={allFlights}
        tripId={tripId}
        userId={userId}
        travelers={travelers}
        canEdit={canEdit}
      />
    </>
  );
}
