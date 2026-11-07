import * as React from "react";
import { Check, Luggage, Plane, Upload, Users } from "lucide-react";
import { formatDateTime } from "@/lib/calendar-utils";
import { LEG_LABEL, personLabel, type MiniProfile, type TripLeg } from "@/lib/tripLogistics";
import { type TripFlight } from "@/hooks/useTripFlights";
import { TimelineSection } from "./TimelineSection";
import { TripSheet } from "@/components/coord/viajes/form";
import { PersonAvatar } from "@/components/coord/viajes/parts";
import { cn } from "@/lib/utils";
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
  /** Abre la asignación de pases con tarjetas para ese vuelo. */
  onUploadPasses?: (flightId: string) => void;
}

export function FlightsSection({ tripId, userId, leg, flights, allFlights, travelers, canEdit, onUploadPasses }: Props) {
  const [formOpen, setFormOpen] = React.useState(false);
  const [detailFor, setDetailFor] = React.useState<TripFlight | null>(null);
  const [listFor, setListFor] = React.useState<TripFlight | null>(null);
  const listed = listFor ? allFlights.find((x) => x.id === listFor.id) ?? listFor : null;

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
          <div key={f.id} className="space-y-1.5">
          <button
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


            <FlightFaces flight={f} />
          </button>
          {f.passengers.length ? (
            <button type="button" onClick={() => setListFor(f)} className="coord-press flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-muted text-xs font-semibold">
              <Users className="h-3.5 w-3.5" /> Ver pasajeros
            </button>
          ) : null}
          {canEdit && onUploadPasses ? (
            <button type="button" onClick={() => onUploadPasses(f.id)} className="coord-press flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-muted text-xs font-semibold">
              <Upload className="h-3.5 w-3.5" /> Subir pases de este vuelo
            </button>
          ) : null}
          </div>
        ))}
      </TimelineSection>

      {canEdit ? (
        <FlightFormDialog open={formOpen} onOpenChange={setFormOpen} tripId={tripId} userId={userId} flight={null} defaultLeg={leg} />
      ) : null}

      <TripSheet open={!!listed} onOpenChange={(v) => !v && setListFor(null)} title={listed ? `Pasajeros · ${listed.flight_code}` : "Pasajeros"}>
        {listed ? (
          <ul className="divide-y divide-border/40 overflow-hidden rounded-[16px] bg-card">
            {[...listed.passengers].sort((a, b) => personLabel(a.profile).localeCompare(personLabel(b.profile), "es")).map((p) => {
              const has = listed.boarding_passes.some((bp) => bp.user_id === p.user_id);
              return (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2.5">
                  <PersonAvatar p={p.profile as MiniProfile | null} />
                  <span className="min-w-0 flex-1 truncate text-sm">{personLabel(p.profile)}</span>
                  <span className={cn("inline-flex shrink-0 items-center gap-1 text-xs font-semibold", has ? "text-primary" : "text-muted-foreground")}>
                    {has ? <><Check className="h-3.5 w-3.5" /> Con pase</> : "Sin pase"}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : null}
      </TripSheet>

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

/** Hasta 6 caras + "+N" y el conteo de pases. */
function FlightFaces({ flight: f }: { flight: TripFlight }) {
  if (!f.passengers.length) return <p className="text-xs text-muted-foreground">Sin pasajeros asignados</p>;
  const withPass = f.passengers.filter((p) => f.boarding_passes.some((bp) => bp.user_id === p.user_id)).length;
  const extra = f.passengers.length - 6;
  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {f.passengers.slice(0, 6).map((p) => <PersonAvatar key={p.id} p={p.profile as MiniProfile | null} className="ring-2 ring-card" />)}
        {extra > 0 ? <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[11px] font-semibold ring-2 ring-card">+{extra}</span> : null}
      </div>
      <span className="text-xs text-muted-foreground">{f.passengers.length} pasajero{f.passengers.length === 1 ? "" : "s"} · {withPass} con pase</span>
    </div>
  );
}
