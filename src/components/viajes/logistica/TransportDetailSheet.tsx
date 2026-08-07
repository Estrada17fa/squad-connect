import * as React from "react";
import { toast } from "sonner";
import { Bus, Pencil, Users } from "lucide-react";
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
import { LEG_LABEL, TRANSPORT_TYPE_LABEL, type MiniProfile } from "@/lib/tripLogistics";
import { useTransportMutations, type TripTransport } from "@/hooks/useTripTransports";
import { PersonChips } from "./PersonChips";
import { TransportFormDialog } from "./TransportFormDialog";
import { PassengerAssignDialog, type AssignCandidate } from "./PassengerAssignDialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  transport: TripTransport | null;
  allTransports: TripTransport[];
  tripId: string;
  userId: string;
  travelers: AssignCandidate[];
  canEdit: boolean;
}

/** Ficha de lectura de un transporte del viaje. */
export function TransportDetailSheet({ open, onOpenChange, transport, allTransports, tripId, userId, travelers, canEdit }: Props) {
  const { setPassengers } = useTransportMutations(tripId);
  const [editOpen, setEditOpen] = React.useState(false);
  const [passengersOpen, setPassengersOpen] = React.useState(false);

  const current = transport ? allTransports.find((t) => t.id === transport.id) ?? transport : null;

  const importSources = React.useMemo(
    () =>
      allTransports
        .filter((t) => t.id !== current?.id && t.passengers.length > 0)
        .map((t) => ({
          label: `${LEG_LABEL[t.leg]} · ${t.label ?? TRANSPORT_TYPE_LABEL[t.transport_type]}`,
          userIds: t.passengers.map((p) => p.user_id),
        })),
    [allTransports, current?.id],
  );

  if (!current) {
    return <EntitySheet open={open} onOpenChange={onOpenChange}><EntitySheetHeader><EntitySheetTitle>Transporte</EntitySheetTitle></EntitySheetHeader><EntitySheetBody /></EntitySheet>;
  }

  return (
    <>
      <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
        <EntitySheetHeader>
          <EntitySheetTitle className="flex items-center gap-2">
            <Bus className="h-4 w-4 text-primary" /> {current.label ?? TRANSPORT_TYPE_LABEL[current.transport_type]}
          </EntitySheetTitle>
          <EntitySheetDescription>
            {LEG_LABEL[current.leg]} · {current.pickup_location} → {current.destination}
          </EntitySheetDescription>
          <div className="mt-3 flex flex-wrap gap-2">
            {canEdit ? (
              <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
              </Button>
            ) : null}
          </div>
        </EntitySheetHeader>

        <EntitySheetBody>
          <DetailSection>
            <DetailGrid>
              <DetailField label="Tipo">{TRANSPORT_TYPE_LABEL[current.transport_type]}</DetailField>
              <DetailField label="Sale">{formatDateTime(current.departs_at)}</DetailField>
            </DetailGrid>
          </DetailSection>

          {current.notes ? (
            <DetailSection title="Notas">
              <p className="text-sm text-muted-foreground">{current.notes}</p>
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
        </EntitySheetBody>

        <EntitySheetFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </EntitySheetFooter>
      </EntitySheet>

      {canEdit ? (
        <TransportFormDialog open={editOpen} onOpenChange={setEditOpen} tripId={tripId} userId={userId} transport={current} defaultLeg={current.leg} />
      ) : null}

      {canEdit && passengersOpen ? (
        <PassengerAssignDialog
          open
          onOpenChange={(v) => !v && setPassengersOpen(false)}
          title={`Pasajeros · ${current.label ?? TRANSPORT_TYPE_LABEL[current.transport_type]}`}
          candidates={travelers}
          selectedIds={current.passengers.map((p) => p.user_id)}
          importSources={importSources}
          saving={setPassengers.isPending}
          onSave={(ids) =>
            setPassengers.mutate(
              { transportId: current.id, current: current.passengers.map((p) => p.user_id), next: ids },
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
    </>
  );
}
