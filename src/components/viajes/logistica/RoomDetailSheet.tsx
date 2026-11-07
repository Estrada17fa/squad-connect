import * as React from "react";
import { toast } from "sonner";
import { BedDouble, StickyNote, Users } from "lucide-react";
import { DetailHero, MoreMenu, TripSheet } from "@/components/coord/viajes/form";
import { SheetRow, SheetRows } from "@/components/agenda/EventSheet";
import { PersonAvatar } from "@/components/coord/viajes/parts";
import { personLabel, type MiniProfile } from "@/lib/tripLogistics";
import { useHotelMutations, type TripHotel, type TripRoom } from "@/hooks/useTripHotels";
import { RoomFormDialog } from "./RoomFormDialog";
import { PassengerAssignDialog, type AssignCandidate } from "./PassengerAssignDialog";
import { useTripRefresh } from "@/hooks/useTripChannel";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  hotel: TripHotel | null;
  room: TripRoom | null;
  tripId: string;
  travelers: AssignCandidate[];
  allRooms: TripRoom[];
  canEdit: boolean;
}

/** Ficha de lectura de un cuarto: etiqueta, notas y ocupantes. */
export function RoomDetailSheet({ open, onOpenChange, hotel, room, tripId, travelers, allRooms, canEdit }: Props) {
  const { setOccupants, removeRoom } = useHotelMutations(tripId);
  const refresh = useTripRefresh(tripId);
  const [editOpen, setEditOpen] = React.useState(false);
  const [occupantsOpen, setOccupantsOpen] = React.useState(false);

  const current = room ? allRooms.find((r) => r.id === room.id) ?? room : null;

  const importSources = React.useMemo(
    () =>
      allRooms
        .filter((r) => r.id !== current?.id && r.occupants.length > 0)
        .map((r) => ({ label: `Cuarto ${r.room_label}`, userIds: r.occupants.map((o) => o.user_id) })),
    [allRooms, current?.id],
  );

  if (!current || !hotel) return null;

  return (
    <>
      <TripSheet open={open} onOpenChange={onOpenChange} title="Cuarto"
        menu={canEdit ? <MoreMenu onEdit={() => setEditOpen(true)} deleteLabel="Eliminar cuarto" confirmTitle={`¿Eliminar el cuarto ${current.room_label}?`} confirmDescription="Se quitarán sus ocupantes." deleting={removeRoom.isPending}
          onDelete={() => removeRoom.mutateAsync(current.id).then(() => { toast.success("Cuarto eliminado"); refresh(); onOpenChange(false); }).catch((e: any) => toast.error(e.message ?? "No se pudo eliminar"))} /> : null}>
        <DetailHero icon={BedDouble} title={`Cuarto ${current.room_label}`} sub={hotel.name} />
        {current.notes ? <SheetRows><SheetRow icon={StickyNote} main={current.notes} /></SheetRows> : null}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Ocupantes</h3>
            {canEdit ? <button type="button" onClick={() => setOccupantsOpen(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><Users className="h-3.5 w-3.5" /> Asignar</button> : null}
          </div>
          {current.occupants.length ? (
            <ul className="divide-y divide-border/40 overflow-hidden rounded-[16px] bg-card">
              {current.occupants.map((o) => (
                <li key={o.id} className="flex items-center gap-3 px-3 py-2.5"><PersonAvatar p={o.profile as MiniProfile | null} /><span className="truncate text-sm">{personLabel(o.profile as MiniProfile | null)}</span></li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">Cuarto sin ocupantes.</p>}
        </section>
      </TripSheet>

      {canEdit ? (
        <RoomFormDialog open={editOpen} onOpenChange={setEditOpen} tripId={tripId} hotelId={hotel.id} room={current} />
      ) : null}

      {canEdit && occupantsOpen ? (
        <PassengerAssignDialog
          open
          onOpenChange={(v) => !v && setOccupantsOpen(false)}
          title={`Ocupantes · Cuarto ${current.room_label}`}
          candidates={travelers}
          selectedIds={current.occupants.map((o) => o.user_id)}
          importSources={importSources}
          saving={setOccupants.isPending}
          onSave={(ids) =>
            setOccupants.mutate(
              { roomId: current.id, current: current.occupants.map((o) => o.user_id), next: ids },
              {
                onSuccess: () => {
                  toast.success("Ocupantes actualizados");
                  setOccupantsOpen(false);
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
