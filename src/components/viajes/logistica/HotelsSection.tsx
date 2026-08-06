import * as React from "react";
import { toast } from "sonner";
import { BedDouble, Hotel as HotelIcon, Pencil, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/calendar-utils";
import type { MiniProfile } from "@/lib/tripLogistics";
import { useHotelMutations, type TripHotel, type TripRoom } from "@/hooks/useTripHotels";
import { TimelineSection } from "./TimelineSection";
import { PersonChips } from "./PersonChips";
import { HotelFormDialog } from "./HotelFormDialog";
import { RoomFormDialog } from "./RoomFormDialog";
import { PassengerAssignDialog, type AssignCandidate } from "./PassengerAssignDialog";

interface Props {
  tripId: string;
  userId: string;
  hotels: TripHotel[];
  travelers: AssignCandidate[];
  canEdit: boolean;
}

export function HotelsSection({ tripId, userId, hotels, travelers, canEdit }: Props) {
  const { setOccupants } = useHotelMutations(tripId);
  const [hotelForm, setHotelForm] = React.useState(false);
  const [editingHotel, setEditingHotel] = React.useState<TripHotel | null>(null);
  const [roomForm, setRoomForm] = React.useState<{ hotelId: string; room: TripRoom | null } | null>(null);
  const [occupantsFor, setOccupantsFor] = React.useState<TripRoom | null>(null);

  const allRooms = React.useMemo(() => hotels.flatMap((h) => h.rooms), [hotels]);
  const importSources = React.useMemo(
    () =>
      allRooms
        .filter((r) => r.id !== occupantsFor?.id && r.occupants.length > 0)
        .map((r) => ({ label: `Cuarto ${r.room_label}`, userIds: r.occupants.map((o) => o.user_id) })),
    [allRooms, occupantsFor?.id],
  );

  return (
    <>
      <TimelineSection
        icon={HotelIcon}
        title="Hotel"
        count={hotels.length}
        canEdit={canEdit}
        addLabel="Agregar hotel"
        emptyLabel="Sin hospedaje registrado."
        onAdd={() => {
          setEditingHotel(null);
          setHotelForm(true);
        }}
      >
        {hotels.map((h) => (
          <article key={h.id} className="glass space-y-3 p-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{h.name}</p>
                {h.address ? <p className="text-xs text-muted-foreground">{h.address}</p> : null}
                <p className="text-xs text-muted-foreground">
                  Entrada {formatDateTime(h.check_in_at)}
                  {h.check_out_at ? ` · Salida ${formatDateTime(h.check_out_at)}` : ""}
                </p>
                {h.phone ? <p className="text-xs text-muted-foreground">Tel. {h.phone}</p> : null}
                {h.notes ? <p className="text-xs text-muted-foreground">{h.notes}</p> : null}
              </div>
              {canEdit ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditingHotel(h);
                    setHotelForm(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : null}
            </div>

            <div className="space-y-2 border-t border-white/5 pt-2">
              <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                <BedDouble className="h-3.5 w-3.5 text-primary" /> Rooming list
              </p>
              {h.rooms.length === 0 ? (
                <p className="text-xs text-muted-foreground">Sin cuartos registrados.</p>
              ) : (
                h.rooms.map((r) => (
                  <div key={r.id} className="rounded-xl border border-border/60 p-2.5">
                    <div className="flex items-center gap-2">
                      <p className="flex-1 text-sm text-foreground">Cuarto {r.room_label}</p>
                      {canEdit ? (
                        <>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setRoomForm({ hotelId: h.id, room: r })}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => setOccupantsFor(r)}
                          >
                            <Users className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      ) : null}
                    </div>
                    {r.notes ? <p className="mb-1.5 text-xs text-muted-foreground">{r.notes}</p> : null}
                    <PersonChips
                      people={r.occupants.map((o) => ({ id: o.id, profile: o.profile as MiniProfile | null }))}
                      emptyLabel="Cuarto sin ocupantes"
                    />
                  </div>
                ))
              )}

              {canEdit ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full"
                  onClick={() => setRoomForm({ hotelId: h.id, room: null })}
                >
                  <Plus className="mr-1.5 h-4 w-4" /> Agregar cuarto
                </Button>
              ) : null}
            </div>
          </article>
        ))}
      </TimelineSection>

      {canEdit ? (
        <HotelFormDialog
          open={hotelForm}
          onOpenChange={setHotelForm}
          tripId={tripId}
          userId={userId}
          hotel={editingHotel}
        />
      ) : null}

      {canEdit && roomForm ? (
        <RoomFormDialog
          open
          onOpenChange={(v) => !v && setRoomForm(null)}
          tripId={tripId}
          hotelId={roomForm.hotelId}
          room={roomForm.room}
        />
      ) : null}

      {canEdit && occupantsFor ? (
        <PassengerAssignDialog
          open
          onOpenChange={(v) => !v && setOccupantsFor(null)}
          title={`Ocupantes · Cuarto ${occupantsFor.room_label}`}
          candidates={travelers}
          selectedIds={occupantsFor.occupants.map((o) => o.user_id)}
          importSources={importSources}
          saving={setOccupants.isPending}
          onSave={(ids) =>
            setOccupants.mutate(
              {
                roomId: occupantsFor.id,
                current: occupantsFor.occupants.map((o) => o.user_id),
                next: ids,
              },
              {
                onSuccess: () => {
                  toast.success("Ocupantes actualizados");
                  setOccupantsFor(null);
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
