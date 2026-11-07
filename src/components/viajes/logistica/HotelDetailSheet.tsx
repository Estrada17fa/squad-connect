import * as React from "react";
import { BedDouble, ChevronRight, Clock, Hotel as HotelIcon, MapPin, Phone, Plus, StickyNote } from "lucide-react";
import { toast } from "sonner";
import { DetailHero, MoreMenu, TripSheet } from "@/components/coord/viajes/form";
import { SheetRow, SheetRows } from "@/components/agenda/EventSheet";
import { LocationCard } from "@/components/location/LocationCard";
import { PersonAvatar } from "@/components/coord/viajes/parts";
import { formatDateTime } from "@/lib/calendar-utils";
import { personLabel, type MiniProfile } from "@/lib/tripLogistics";
import { type TripHotel, type TripRoom } from "@/hooks/useTripHotels";
import { HotelFormDialog } from "./HotelFormDialog";
import { useHotelMutations } from "@/hooks/useTripHotels";
import { useTripRefresh } from "@/hooks/useTripChannel";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hotel: TripHotel | null;
  tripId: string;
  clubId: string;
  userId: string;
  canEdit: boolean;
  onOpenRoom: (room: TripRoom) => void;
  onAddRoom: (hotelId: string) => void;
}

/** Ficha de lectura de un hotel: datos generales y rooming list. */
export function HotelDetailSheet({ open, onOpenChange, hotel, tripId, clubId, userId, canEdit, onOpenRoom, onAddRoom }: Props) {
  const [editOpen, setEditOpen] = React.useState(false);
  const { removeHotel } = useHotelMutations(tripId);
  const refresh = useTripRefresh(tripId);

  if (!hotel) return null;
  const locId = ((hotel as any).location_id as string | null) ?? null;

  return (
    <>
      <TripSheet open={open} onOpenChange={onOpenChange} title="Hotel"
        menu={canEdit ? <MoreMenu onEdit={() => setEditOpen(true)} deleteLabel="Eliminar hotel" confirmTitle={`¿Eliminar ${hotel.name}?`} confirmDescription="Se borrarán sus cuartos y la rooming list." deleting={removeHotel.isPending}
          onDelete={() => removeHotel.mutateAsync(hotel.id).then(() => { toast.success("Hotel eliminado"); refresh(); onOpenChange(false); }).catch((e: any) => toast.error(e.message ?? "No se pudo eliminar"))} /> : null}>
        <DetailHero icon={HotelIcon} title={hotel.name} sub={`${hotel.rooms.length} cuarto${hotel.rooms.length === 1 ? "" : "s"}`} />
        <SheetRows>
          <SheetRow icon={Clock} main={`Entrada ${formatDateTime(hotel.check_in_at)}`} sub={hotel.check_out_at ? `Salida ${formatDateTime(hotel.check_out_at)}` : "Horario de referencia del staff"} />
          {hotel.phone ? <SheetRow icon={Phone} main={<a href={`tel:${hotel.phone}`} className="text-primary">{hotel.phone}</a>} sub="Teléfono" /> : null}
          {!locId && hotel.address ? <SheetRow icon={MapPin} main={hotel.address} sub="Dirección" /> : null}
          {hotel.notes ? <SheetRow icon={StickyNote} main={hotel.notes} /> : null}
        </SheetRows>
        {locId ? <LocationCard locationId={locId} /> : null}

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Rooming list</h3>
            {canEdit ? <button type="button" onClick={() => onAddRoom(hotel.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><Plus className="h-3.5 w-3.5" /> Agregar cuarto</button> : null}
          </div>
          {hotel.rooms.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin cuartos registrados.</p>
          ) : (
            <div className="divide-y divide-border/40 overflow-hidden rounded-[16px] bg-card">
              {hotel.rooms.map((r) => (
                <button key={r.id} type="button" className="flex w-full items-center gap-3 px-3.5 py-3 text-left" onClick={() => onOpenRoom(r)}>
                  <BedDouble className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">Cuarto {r.room_label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{r.occupants.length ? r.occupants.map((o) => personLabel(o.profile as MiniProfile | null).split(" ")[0]).join(", ") : "Sin ocupantes"}</span>
                  </span>
                  <div className="flex -space-x-2">{r.occupants.slice(0, 4).map((o) => <PersonAvatar key={o.id} p={o.profile as MiniProfile | null} size={6} className="ring-2 ring-card" />)}</div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </section>
      </TripSheet>

      {canEdit ? (
        <HotelFormDialog open={editOpen} onOpenChange={setEditOpen} tripId={tripId} clubId={clubId} userId={userId} hotel={hotel} />
      ) : null}
    </>
  );
}
