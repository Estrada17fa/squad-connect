import * as React from "react";
import { toast } from "sonner";
import { FileText, Luggage, Pencil, Plane, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { DetailField, DetailGrid, DetailSection } from "@/components/squad/DetailSheet";
import { formatDateTime } from "@/lib/calendar-utils";
import { LEG_LABEL, personLabel, type MiniProfile, type TripLeg } from "@/lib/tripLogistics";
import { useFlightMutations, type TripFlight } from "@/hooks/useTripFlights";
import { PersonChips } from "./PersonChips";
import { FlightFormDialog } from "./FlightFormDialog";
import { BoardingPassesSheet } from "./BoardingPassesSheet";
import { FlightLuggageSection } from "./FlightLuggageSection";
import { DeleteAction } from "./DeleteAction";
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

  if (!current) {
    return <EntitySheet open={open} onOpenChange={onOpenChange}><EntitySheetHeader><EntitySheetTitle>Vuelo</EntitySheetTitle></EntitySheetHeader><EntitySheetBody /></EntitySheet>;
  }

  return (
    <>
      <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
        <EntitySheetHeader>
          <EntitySheetTitle className="flex items-center gap-2">
            <Plane className="h-4 w-4 text-primary" /> {current.flight_code}
          </EntitySheetTitle>
          <EntitySheetDescription>
            {LEG_LABEL[current.leg]} · {current.origin} → {current.destination}
          </EntitySheetDescription>
          <div className="mt-3 flex flex-wrap gap-2">
            {canEdit ? (
              <>
                <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                  <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
                </Button>
                <DeleteAction
                  label="Eliminar vuelo"
                  title={`¿Eliminar el vuelo ${current.flight_code}?`}
                  description="Se borrarán sus pasajeros, equipaje y pases de abordar. Esta acción no se puede deshacer."
                  successMessage="Vuelo eliminado"
                  loading={remove.isPending}
                  onDelete={() => remove.mutateAsync(current.id)}
                  onDeleted={() => {
                    refresh();
                    onOpenChange(false);
                  }}
                />
              </>
            ) : null}
          </div>
        </EntitySheetHeader>

        <EntitySheetBody>
          <DetailSection>
            <DetailGrid>
              <DetailField label="Aerolínea">{current.airline ?? "—"}</DetailField>
              <DetailField label="Puerta">{current.gate ?? "—"}</DetailField>
              <DetailField label="Sale">{formatDateTime(current.departs_at)}</DetailField>
              <DetailField label="Llega">{current.arrives_at ? formatDateTime(current.arrives_at) : "—"}</DetailField>
            </DetailGrid>
          </DetailSection>

          {current.notes ? (
            <DetailSection title="Notas">
              <p className="text-sm text-muted-foreground">{current.notes}</p>
            </DetailSection>
          ) : null}

          {current.baggage_instructions ? (
            <DetailSection title="Instrucciones de equipaje">
              <p className="flex items-start gap-1.5 text-sm text-muted-foreground">
                <Luggage className="mt-0.5 h-4 w-4 shrink-0" /> {current.baggage_instructions}
              </p>
            </DetailSection>
          ) : null}

          <DetailSection title="Pasajeros">
            <PersonChips
              people={current.passengers.map((p) => ({ id: p.id, profile: p.profile as MiniProfile | null }))}
              emptyLabel="Sin pasajeros asignados"
            />
            {canEdit ? (
              <Button type="button" size="sm" variant="outline" onClick={() => setPassengersOpen(true)}>
                <Users className="mr-1.5 h-4 w-4" /> Asignar pasajeros
              </Button>
            ) : null}
          </DetailSection>

          <DetailSection title="Equipaje">
            <FlightLuggageSection tripId={tripId} flight={current} canEdit={canEdit} />
          </DetailSection>

          <DetailSection title="Pases de abordar">
            <p className="text-sm text-muted-foreground">
              {current.passengers.filter((p) => current.boarding_passes.some((bp) => bp.user_id === p.user_id)).length}{" "}
              de {current.passengers.length} con pase
            </p>
            <Button type="button" size="sm" variant="outline" onClick={() => setPassesOpen(true)}>
              <FileText className="mr-1.5 h-4 w-4" /> {canEdit ? "Gestionar pases" : "Ver pases"} (
              {current.boarding_passes.length})
            </Button>
          </DetailSection>
        </EntitySheetBody>

        <EntitySheetFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </EntitySheetFooter>
      </EntitySheet>

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
