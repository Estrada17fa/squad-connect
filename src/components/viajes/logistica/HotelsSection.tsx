import * as React from "react";
import { BedDouble, Hotel as HotelIcon } from "lucide-react";
import { formatDateTime } from "@/lib/calendar-utils";
import type { MiniProfile } from "@/lib/tripLogistics";
import { type TripHotel, type TripRoom } from "@/hooks/useTripHotels";
import { TimelineSection } from "./TimelineSection";
import { PersonChips } from "./PersonChips";
import { HotelFormDialog } from "./HotelFormDialog";
import { RoomFormDialog } from "./RoomFormDialog";
import { HotelDetailSheet } from "./HotelDetailSheet";
import { RoomDetailSheet } from "./RoomDetailSheet";
import { type AssignCandidate } from "./PassengerAssignDialog";

interface Props {
  tripId: string;
  clubId: string;
  userId: string;
  hotels: TripHotel[];
  travelers: AssignCandidate[];
  canEdit: boolean;
}

export function HotelsSection({ tripId, clubId, userId, hotels, travelers, canEdit }: Props) {
  const [hotelForm, setHotelForm] = React.useState(false);
  const [roomForm, setRoomForm] = React.useState<{ hotelId: string; room: TripRoom | null } | null>(null);
  const [detailHotelId, setDetailHotelId] = React.useState<string | null>(null);
  const [detailRoom, setDetailRoom] = React.useState<{ hotelId: string; room: TripRoom } | null>(null);

  const allRooms = React.useMemo(() => hotels.flatMap((h) => h.rooms), [hotels]);
  const detailHotel = hotels.find((h) => h.id === detailHotelId) ?? null;
  const detailRoomHotel = detailRoom ? hotels.find((h) => h.id === detailRoom.hotelId) ?? null : null;

  return (
    <>
      <TimelineSection
        icon={HotelIcon}
        title="Hotel"
        count={hotels.length}
        canEdit={canEdit}
        addLabel="Agregar hotel"
        emptyLabel="Sin hospedaje registrado."
        onAdd={() => setHotelForm(true)}
      >
        {hotels.map((h) => (
          <button
            key={h.id}
            type="button"
            className="glass w-full space-y-3 p-3 text-left transition-colors hover:bg-white/[0.04]"
            onClick={() => setDetailHotelId(h.id)}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{h.name}</p>
              {h.address ? <p className="text-xs text-muted-foreground">{h.address}</p> : null}
              <p className="text-xs text-muted-foreground">
                Entrada {formatDateTime(h.check_in_at)}
                {h.check_out_at ? ` · Salida ${formatDateTime(h.check_out_at)}` : ""}
              </p>
            </div>

            <div className="space-y-2 border-t border-white/5 pt-2">
              <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <BedDouble className="h-3.5 w-3.5 text-primary" /> Rooming list ({h.rooms.length})
              </p>
              {h.rooms.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin cuartos registrados.</p>
              ) : (
                h.rooms.slice(0, 2).map((r) => (
                  <PersonChips
                    key={r.id}
                    people={r.occupants.map((o) => ({ id: o.id, profile: o.profile as MiniProfile | null }))}
                    emptyLabel={`Cuarto ${r.room_label}: sin ocupantes`}
                  />
                ))
              )}
            </div>
          </button>
        ))}
      </TimelineSection>

      {canEdit ? <HotelFormDialog open={hotelForm} onOpenChange={setHotelForm} tripId={tripId} clubId={clubId} userId={userId} hotel={null} /> : null}

      {canEdit && roomForm ? (
        <RoomFormDialog
          open
          onOpenChange={(v) => !v && setRoomForm(null)}
          tripId={tripId}
          hotelId={roomForm.hotelId}
          room={roomForm.room}
        />
      ) : null}

      <HotelDetailSheet
        open={!!detailHotel}
        onOpenChange={(v) => !v && setDetailHotelId(null)}
        hotel={detailHotel}
        tripId={tripId}
        clubId={clubId}
        userId={userId}
        canEdit={canEdit}
        onOpenRoom={(room) => detailHotel && setDetailRoom({ hotelId: detailHotel.id, room })}
        onAddRoom={(hotelId) => setRoomForm({ hotelId, room: null })}
      />

      <RoomDetailSheet
        open={!!detailRoom}
        onOpenChange={(v) => !v && setDetailRoom(null)}
        hotel={detailRoomHotel}
        room={detailRoom?.room ?? null}
        tripId={tripId}
        travelers={travelers}
        allRooms={allRooms}
        canEdit={canEdit}
      />
    </>
  );
}
