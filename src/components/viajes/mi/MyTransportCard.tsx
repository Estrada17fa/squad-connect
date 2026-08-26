import { Bus } from "lucide-react";
import { formatDateTime } from "@/lib/calendar-utils";
import { LEG_LABEL, TRANSPORT_TYPE_LABEL } from "@/lib/tripLogistics";
import type { TripTransport } from "@/hooks/useTripTransports";
import { TripCardShell, TripLine } from "./TripCardShell";

/** Mi transporte terrestre asignado. */
export function MyTransportCard({ transport }: { transport: TripTransport }) {
  return (
    <TripCardShell
      icon={Bus}
      eyebrow={`Mi transporte · ${LEG_LABEL[transport.leg]}`}
      title={`${TRANSPORT_TYPE_LABEL[transport.transport_type]}${transport.label ? ` · ${transport.label}` : ""}`}
    >
      <p className="text-sm text-foreground">
        {transport.pickup_location} <span className="text-muted-foreground">→</span> {transport.destination}
      </p>
      <TripLine>Sale: {formatDateTime(transport.departs_at)}</TripLine>
      <TripLine>{transport.notes}</TripLine>
    </TripCardShell>
  );
}
