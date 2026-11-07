import * as React from "react";
import { toast } from "sonner";
import { ChevronRight, Clock, DoorOpen, Luggage, Plane, StickyNote, Ticket, Users } from "lucide-react";
import { DetailHero, MoreMenu, TripSheet } from "@/components/coord/viajes/form";
import { SheetRow, SheetRows } from "@/components/agenda/EventSheet";
import { formatDateTime } from "@/lib/calendar-utils";
import { LEG_LABEL, type TripLeg } from "@/lib/tripLogistics";
import { useFlightMutations, type TripFlight } from "@/hooks/useTripFlights";
import { FlightFormDialog } from "./FlightFormDialog";
import { BoardingPassesSheet } from "./BoardingPassesSheet";
import { FlightLuggageSection } from "./FlightLuggageSection";
import { useTripRefresh } from "@/hooks/useTripChannel";
import { PassengerAssignDialog, type AssignCandidate } from "./PassengerAssignDialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  flight: TripFlight | null;
  allFlights: TripFlight[];
  tripId: string;
  userId: string;
  travelers: AssignCandidate[];
  canEdit: boolean;
}

/** Ficha de lectura de un vuelo del viaje: horarios, ruta, pasajeros y equipaje. */
export function FlightDetailSheet({ open, onOpenChange, flight, allFlights, tripId, userId, travelers, canEdit }: Props) {
  const { setPassengers, remove } = useFlightMutations(tripId);
  const refresh = useTripRefresh(tripId);
  const [editOpen, setEditOpen] = React.useState(false);
  const [passengersOpen, setPassengersOpen] = React.useState(false);
  const [passesOpen, setPassesOpen] = React.useState(false);

  const current = flight ? allFlights.find((f) => f.id === flight.id) ?? flight : null;

  const importSources = React.useMemo(
    () =>
      allFlights
        .filter((f) => f.id !== current?.id && f.passengers.length > 0)
        .map((f) => ({ label: `${LEG_LABEL[f.leg]} · ${f.flight_code}`, userIds: f.passengers.map((p) => p.user_id) })),
    [allFlights, current?.id],
  );

  if (!current) return null;
  const withPass = current.passengers.filter((p) => current.boarding_passes.some((bp) => bp.user_id === p.user_id)).length;
  const rowBtn = "flex w-full items-center gap-3 px-3.5 py-3 text-left";

  return (
    <>
      <TripSheet open={open} onOpenChange={onOpenChange} title="Vuelo"
        menu={canEdit ? <MoreMenu onEdit={() => setEditOpen(true)} onDelete={() => remove.mutateAsync(current.id).then(() => { toast.success("Vuelo eliminado"); refresh(); onOpenChange(false); }).catch((e: any) => toast.error(e.message ?? "No se pudo eliminar"))}
          deleteLabel="Eliminar vuelo" confirmTitle={`¿Eliminar el vuelo ${current.flight_code}?`} confirmDescription="Se borrarán sus pasajeros, equipaje y pases de abordar." deleting={remove.isPending} /> : null}>
        <DetailHero icon={Plane} title={`${current.origin} → ${current.destination}`} sub={`${LEG_LABEL[current.leg]} · ${current.flight_code}${current.airline ? ` · ${current.airline}` : ""}`} />
        <SheetRows>
          <SheetRow icon={Clock} main={formatDateTime(current.departs_at)} sub={current.arrives_at ? `Llega ${formatDateTime(current.arrives_at)}` : "Salida"} />
          {current.gate ? <SheetRow icon={DoorOpen} main={current.gate} sub="Puerta o sala" /> : null}
          {current.baggage_instructions ? <SheetRow icon={Luggage} main={current.baggage_instructions} sub="Instrucción de equipaje" /> : null}
          {current.notes ? <SheetRow icon={StickyNote} main={current.notes} /> : null}
        </SheetRows>
        <SheetRows>
          <button type="button" className={rowBtn} onClick={() => canEdit && setPassengersOpen(true)} disabled={!canEdit}>
            <Users className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{current.passengers.length} pasajeros</span><span className="block text-xs text-muted-foreground">{canEdit ? "Asignar pasajeros" : "En este vuelo"}</span></span>
            {canEdit ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : null}
          </button>
          <button type="button" className={rowBtn} onClick={() => setPassesOpen(true)}>
            <Ticket className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
            <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{withPass} de {current.passengers.length} con pase</span><span className="block text-xs text-muted-foreground">{canEdit ? "Gestionar pases" : "Ver pases"}</span></span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </SheetRows>
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Equipaje</h3>
          <FlightLuggageSection tripId={tripId} flight={current} canEdit={canEdit} />
        </section>
      </TripSheet>

      {canEdit ? (
        <FlightFormDialog open={editOpen} onOpenChange={setEditOpen} tripId={tripId} userId={userId} flight={current} defaultLeg={current.leg} />
      ) : null}

      {canEdit && passengersOpen ? (
        <PassengerAssignDialog
          open
          onOpenChange={(v) => !v && setPassengersOpen(false)}
          title={`Pasajeros · ${current.flight_code}`}
          candidates={travelers}
          selectedIds={current.passengers.map((p) => p.user_id)}
          importSources={importSources}
          saving={setPassengers.isPending}
          onSave={(ids) =>
            setPassengers.mutate(
              { flightId: current.id, current: current.passengers.map((p) => p.user_id), next: ids },
              {
                onSuccess: () => {
                  toast.success("Pasajeros actualizados");
                  setPassengersOpen(false);
                },
                onError: (e: any) => toast.error(e.message ?? "No se pudo guardar"),
              },
            )
          }
        />
      ) : null}

      {passesOpen ? (
        <BoardingPassesSheet
          open
          onOpenChange={(v: boolean) => !v && setPassesOpen(false)}
          tripId={tripId}
          flight={current}
          canEdit={canEdit}
        />
      ) : null}

    </>
  );
}
