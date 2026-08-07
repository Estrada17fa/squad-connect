import * as React from "react";
import { toast } from "sonner";
import { BedDouble, Pencil, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { DetailSection } from "@/components/squad/DetailSheet";
import type { MiniProfile } from "@/lib/tripLogistics";
import { useHotelMutations, type TripHotel, type TripRoom } from "@/hooks/useTripHotels";
import { PersonChips } from "./PersonChips";
import { RoomFormDialog } from "./RoomFormDialog";
import { PassengerAssignDialog, type AssignCandidate } from "./PassengerAssignDialog";

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
  const { setOccupants } = useHotelMutations(tripId);
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

  if (!current || !hotel) {
    return <EntitySheet open={open} onOpenChange={onOpenChange}><EntitySheetHeader><EntitySheetTitle>Cuarto</EntitySheetTitle></EntitySheetHeader><EntitySheetBody /></EntitySheet>;
  }

  return (
    <>
      <EntitySheet open={open} onOpenChange={onOpenChange} size="md">
        <EntitySheetHeader>
          <EntitySheetTitle className="flex items-center gap-2">
            <BedDouble className="h-4 w-4 text-primary" /> Cuarto {current.room_label}
          </EntitySheetTitle>
          <div className="mt-3 flex flex-wrap gap-2">
            {canEdit ? (
              <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
              </Button>
            ) : null}
          </div>
        </EntitySheetHeader>

        <EntitySheetBody>
          {current.notes ? (
            <DetailSection title="Notas">
              <p className="text-sm text-muted-foreground">{current.notes}</p>
            </DetailSection>
          ) : null}

          <DetailSection title="Ocupantes">
            <PersonChips
              people={current.occupants.map((o) => ({ id: o.id, profile: o.profile as MiniProfile | null }))}
              emptyLabel="Cuarto sin ocupantes"
            />
            {canEdit ? (
              <Button type="button" size="sm" variant="outline" onClick={() => setOccupantsOpen(true)}>
                <Users className="mr-1.5 h-4 w-4" /> Asignar ocupantes
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
