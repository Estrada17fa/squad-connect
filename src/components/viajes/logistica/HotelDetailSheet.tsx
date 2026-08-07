import * as React from "react";
import { BedDouble, Hotel as HotelIcon, Pencil, Plus, Users } from "lucide-react";
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
import type { MiniProfile } from "@/lib/tripLogistics";
import { type TripHotel, type TripRoom } from "@/hooks/useTripHotels";
import { PersonChips } from "./PersonChips";
import { HotelFormDialog } from "./HotelFormDialog";
import { RoomFormDialog } from "./RoomFormDialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hotel: TripHotel | null;
  tripId: string;
  userId: string;
  canEdit: boolean;
  onOpenRoom: (room: TripRoom) => void;
  onAddRoom: (hotelId: string) => void;
}

/** Ficha de lectura de un hotel: datos generales y rooming list. */
export function HotelDetailSheet({ open, onOpenChange, hotel, tripId, userId, canEdit, onOpenRoom, onAddRoom }: Props) {
  const [editOpen, setEditOpen] = React.useState(false);

  if (!hotel) {
    return <EntitySheet open={open} onOpenChange={onOpenChange}><EntitySheetHeader><EntitySheetTitle>Hotel</EntitySheetTitle></EntitySheetHeader><EntitySheetBody /></EntitySheet>;
  }

  return (
    <>
      <EntitySheet open={open} onOpenChange={onOpenChange} size="lg">
        <EntitySheetHeader>
          <EntitySheetTitle className="flex items-center gap-2">
            <HotelIcon className="h-4 w-4 text-primary" /> {hotel.name}
          </EntitySheetTitle>
          {hotel.address ? <EntitySheetDescription>{hotel.address}</EntitySheetDescription> : null}
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
              <DetailField label="Entrada">{formatDateTime(hotel.check_in_at)}</DetailField>
              <DetailField label="Salida">{hotel.check_out_at ? formatDateTime(hotel.check_out_at) : "—"}</DetailField>
              <DetailField label="Teléfono">{hotel.phone ?? "—"}</DetailField>
            </DetailGrid>
          </DetailSection>

          {hotel.notes ? (
            <DetailSection title="Notas">
              <p className="text-sm text-muted-foreground">{hotel.notes}</p>
            </DetailSection>
          ) : null}

          <DetailSection title="Rooming list">
            {hotel.rooms.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin cuartos registrados.</p>
            ) : (
              <div className="space-y-2">
                {hotel.rooms.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className="w-full rounded-xl border border-border/60 p-2.5 text-left transition-colors hover:bg-white/[0.04]"
                    onClick={() => onOpenRoom(r)}
                  >
                    <div className="flex items-center gap-2">
                      <BedDouble className="h-3.5 w-3.5 text-primary" />
                      <p className="flex-1 text-sm text-foreground">Cuarto {r.room_label}</p>
                    </div>
                    <PersonChips
                      people={r.occupants.map((o) => ({ id: o.id, profile: o.profile as MiniProfile | null }))}
                      emptyLabel="Cuarto sin ocupantes"
                    />
                  </button>
                ))}
              </div>
            )}
            {canEdit ? (
              <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => onAddRoom(hotel.id)}>
                <Plus className="mr-1.5 h-4 w-4" /> Agregar cuarto
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
        <HotelFormDialog open={editOpen} onOpenChange={setEditOpen} tripId={tripId} userId={userId} hotel={hotel} />
      ) : null}
    </>
  );
}
