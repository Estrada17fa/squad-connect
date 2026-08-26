import { CalendarClock } from "lucide-react";
import { formatDateTime } from "@/lib/calendar-utils";
import { TripCardShell, TripLine } from "./TripCardShell";

/** Mi citación: hora y punto de reunión. */
export function MyCallCard({ meetingAt, meetingPoint }: { meetingAt: string; meetingPoint: string | null }) {
  return (
    <TripCardShell icon={CalendarClock} eyebrow="Mi citación" title={formatDateTime(meetingAt)}>
      <TripLine>{meetingPoint ? `Punto de reunión: ${meetingPoint}` : null}</TripLine>
    </TripCardShell>
  );
}
