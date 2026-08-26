import { Bed } from "lucide-react";
import { formatDateTime } from "@/lib/calendar-utils";
import { personLabel } from "@/lib/tripLogistics";
import type { TripHotel, TripRoom } from "@/hooks/useTripHotels";
import { TripCardShell, TripLine } from "./TripCardShell";

/** Mi hospedaje: hotel, cuarto y con quién lo comparto. */
export function MyStayCard({
  hotel,
  room,
  userId,
}: {
  hotel: TripHotel;
  room: TripRoom;
  userId: string;
}) {
  const mates = room.occupants.filter((o) => o.user_id !== userId).map((o) => personLabel(o.profile));
  return (
    <TripCardShell icon={Bed} eyebrow="Mi hospedaje" title={hotel.name}>
      <p className="text-sm text-foreground">Cuarto {room.room_label}</p>
      <TripLine>{hotel.address}</TripLine>
      <TripLine>Entrada: {formatDateTime(hotel.check_in_at)}</TripLine>
      {hotel.check_out_at ? <TripLine>Salida: {formatDateTime(hotel.check_out_at)}</TripLine> : null}
      <TripLine>{mates.length > 0 ? `Compartes con: ${mates.join(", ")}` : "Cuarto individual"}</TripLine>
      <TripLine>{room.notes}</TripLine>
    </TripCardShell>
  );
}
