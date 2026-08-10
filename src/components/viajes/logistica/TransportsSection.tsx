import * as React from "react";
import { Bus } from "lucide-react";
import { formatDateTime } from "@/lib/calendar-utils";
import { LEG_LABEL, TRANSPORT_TYPE_LABEL, type MiniProfile, type TripLeg } from "@/lib/tripLogistics";
import { type TripTransport } from "@/hooks/useTripTransports";
import { TimelineSection } from "./TimelineSection";
import { PersonChips } from "./PersonChips";
import { TransportFormDialog } from "./TransportFormDialog";
import { TransportDetailSheet } from "./TransportDetailSheet";
import { type AssignCandidate } from "./PassengerAssignDialog";

interface Props {
  tripId: string;
  clubId: string;
  userId: string;
  leg: TripLeg;
  transports: TripTransport[];
  allTransports: TripTransport[];
  travelers: AssignCandidate[];
  canEdit: boolean;
}

export function TransportsSection({ tripId, clubId, userId, leg, transports, allTransports, travelers, canEdit }: Props) {
  const [formOpen, setFormOpen] = React.useState(false);
  const [detailFor, setDetailFor] = React.useState<TripTransport | null>(null);

  return (
    <>
      <TimelineSection
        icon={Bus}
        title={`Transporte ${LEG_LABEL[leg].toLowerCase()}`}
        count={transports.length}
        canEdit={canEdit}
        addLabel="Agregar transporte"
        emptyLabel="Sin transporte registrado."
        onAdd={() => setFormOpen(true)}
      >
        {transports.map((t) => (
          <button
            key={t.id}
            type="button"
            className="glass w-full space-y-2 p-3 text-left transition-colors hover:bg-white/[0.04]"
            onClick={() => setDetailFor(t)}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                {t.label ?? TRANSPORT_TYPE_LABEL[t.transport_type]}
                {t.label ? <span className="text-muted-foreground"> · {TRANSPORT_TYPE_LABEL[t.transport_type]}</span> : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {t.pickup_location} → {t.destination}
              </p>
              <p className="text-xs text-muted-foreground">Sale {formatDateTime(t.departs_at)}</p>
              <p className="text-xs text-primary">
                {t.passengers.length} pasajero{t.passengers.length === 1 ? "" : "s"}
              </p>
            </div>

            <PersonChips
              people={t.passengers.map((p) => ({ id: p.id, profile: p.profile as MiniProfile | null }))}
              emptyLabel="Sin pasajeros asignados"
            />
          </button>
        ))}
      </TimelineSection>

      {canEdit ? (
        <TransportFormDialog open={formOpen} onOpenChange={setFormOpen} tripId={tripId} clubId={clubId} userId={userId} transport={null} defaultLeg={leg} />
      ) : null}

      <TransportDetailSheet
        open={!!detailFor}
        onOpenChange={(v) => !v && setDetailFor(null)}
        transport={detailFor}
        allTransports={allTransports}
        tripId={tripId}
        clubId={clubId}
        userId={userId}
        travelers={travelers}
        canEdit={canEdit}
      />
    </>
  );
}
