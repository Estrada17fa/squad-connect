import * as React from "react";
import { toast } from "sonner";
import { Bus, Pencil, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/calendar-utils";
import { LEG_LABEL, TRANSPORT_TYPE_LABEL, type MiniProfile, type TripLeg } from "@/lib/tripLogistics";
import { useTransportMutations, type TripTransport } from "@/hooks/useTripTransports";
import { TimelineSection } from "./TimelineSection";
import { PersonChips } from "./PersonChips";
import { TransportFormDialog } from "./TransportFormDialog";
import { PassengerAssignDialog, type AssignCandidate } from "./PassengerAssignDialog";

interface Props {
  tripId: string;
  userId: string;
  leg: TripLeg;
  transports: TripTransport[];
  allTransports: TripTransport[];
  travelers: AssignCandidate[];
  canEdit: boolean;
}

export function TransportsSection({
  tripId,
  userId,
  leg,
  transports,
  allTransports,
  travelers,
  canEdit,
}: Props) {
  const { setPassengers } = useTransportMutations(tripId);
  const [formOpen, setFormOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TripTransport | null>(null);
  const [passengersFor, setPassengersFor] = React.useState<TripTransport | null>(null);

  const importSources = React.useMemo(
    () =>
      allTransports
        .filter((t) => t.id !== passengersFor?.id && t.passengers.length > 0)
        .map((t) => ({
          label: `${LEG_LABEL[t.leg]} · ${t.label ?? TRANSPORT_TYPE_LABEL[t.transport_type]}`,
          userIds: t.passengers.map((p) => p.user_id),
        })),
    [allTransports, passengersFor?.id],
  );

  return (
    <>
      <TimelineSection
        icon={Bus}
        title={`Transporte ${LEG_LABEL[leg].toLowerCase()}`}
        count={transports.length}
        canEdit={canEdit}
        addLabel="Agregar transporte"
        emptyLabel="Sin transporte registrado."
        onAdd={() => {
          setEditing(null);
          setFormOpen(true);
        }}
      >
        {transports.map((t) => (
          <article key={t.id} className="glass space-y-2 p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {t.label ?? TRANSPORT_TYPE_LABEL[t.transport_type]}
                  {t.label ? (
                    <span className="text-muted-foreground"> · {TRANSPORT_TYPE_LABEL[t.transport_type]}</span>
                  ) : null}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.pickup_location} → {t.destination}
                </p>
                <p className="text-xs text-muted-foreground">Sale {formatDateTime(t.departs_at)}</p>
              </div>
              {canEdit ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditing(t);
                    setFormOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : null}
            </div>

            {t.notes ? <p className="text-xs text-muted-foreground">{t.notes}</p> : null}

            <PersonChips
              people={t.passengers.map((p) => ({ id: p.id, profile: p.profile as MiniProfile | null }))}
              emptyLabel="Sin pasajeros asignados"
            />

            {canEdit ? (
              <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => setPassengersFor(t)}>
                <Users className="mr-1.5 h-4 w-4" /> Asignar pasajeros
              </Button>
            ) : null}
          </article>
        ))}
      </TimelineSection>

      {canEdit ? (
        <TransportFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          tripId={tripId}
          userId={userId}
          transport={editing}
          defaultLeg={leg}
        />
      ) : null}

      {canEdit && passengersFor ? (
        <PassengerAssignDialog
          open
          onOpenChange={(v) => !v && setPassengersFor(null)}
          title={`Pasajeros · ${passengersFor.label ?? TRANSPORT_TYPE_LABEL[passengersFor.transport_type]}`}
          candidates={travelers}
          selectedIds={passengersFor.passengers.map((p) => p.user_id)}
          importSources={importSources}
          saving={setPassengers.isPending}
          onSave={(ids) =>
            setPassengers.mutate(
              {
                transportId: passengersFor.id,
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
    </>
  );
}
