import * as React from "react";
import { toast } from "sonner";
import { Bus, Clock, Flag, MapPin, StickyNote, Users } from "lucide-react";
import { DetailHero, MoreMenu, TripSheet } from "@/components/coord/viajes/form";
import { SheetRow, SheetRows } from "@/components/agenda/EventSheet";
import { LocationCard } from "@/components/location/LocationCard";
import { PersonAvatar } from "@/components/coord/viajes/parts";
import { formatDateTime } from "@/lib/calendar-utils";
import { LEG_LABEL, TRANSPORT_TYPE_LABEL, personLabel, type MiniProfile } from "@/lib/tripLogistics";
import { useTransportMutations, type TripTransport } from "@/hooks/useTripTransports";
import { TransportFormDialog } from "./TransportFormDialog";
import { PassengerAssignDialog, type AssignCandidate } from "./PassengerAssignDialog";
import { useTripRefresh } from "@/hooks/useTripChannel";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  transport: TripTransport | null;
  clubId: string;
  allTransports: TripTransport[];
  tripId: string;
  userId: string;
  travelers: AssignCandidate[];
  canEdit: boolean;
}

/** Ficha de lectura de un transporte del viaje. */
export function TransportDetailSheet({ open, onOpenChange, transport, allTransports, tripId, clubId, userId, travelers, canEdit }: Props) {
  const { setPassengers, remove } = useTransportMutations(tripId);
  const refresh = useTripRefresh(tripId);
  const [editOpen, setEditOpen] = React.useState(false);
  const [passengersOpen, setPassengersOpen] = React.useState(false);

  const current = transport ? allTransports.find((t) => t.id === transport.id) ?? transport : null;

  const importSources = React.useMemo(
    () =>
      allTransports
        .filter((t) => t.id !== current?.id && t.passengers.length > 0)
        .map((t) => ({
          label: `${LEG_LABEL[t.leg]} · ${t.label ?? TRANSPORT_TYPE_LABEL[t.transport_type]}`,
          userIds: t.passengers.map((p) => p.user_id),
        })),
    [allTransports, current?.id],
  );

  const assignedElsewhere = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const t of allTransports) {
      if (t.id === current?.id || t.leg !== current?.leg) continue;
      for (const p of t.passengers) map[p.user_id] = t.label ?? TRANSPORT_TYPE_LABEL[t.transport_type];
    }
    return map;
  }, [allTransports, current?.id, current?.leg]);

  if (!current) return null;
  const name = current.label ?? TRANSPORT_TYPE_LABEL[current.transport_type];

  return (
    <>
      <TripSheet open={open} onOpenChange={onOpenChange} title="Transporte"
        menu={canEdit ? <MoreMenu onEdit={() => setEditOpen(true)} deleteLabel="Eliminar transporte" confirmTitle="¿Eliminar este transporte?" confirmDescription="Se borrarán también sus pasajeros asignados." deleting={remove.isPending}
          onDelete={() => remove.mutateAsync(current.id).then(() => { toast.success("Transporte eliminado"); refresh(); onOpenChange(false); }).catch((e: any) => toast.error(e.message ?? "No se pudo eliminar"))} /> : null}>
        <DetailHero icon={Bus} title={name} sub={`${LEG_LABEL[current.leg]} · ${TRANSPORT_TYPE_LABEL[current.transport_type]}`} />
        <SheetRows>
          <SheetRow icon={Clock} main={formatDateTime(current.departs_at)} sub="Salida" />
          {!current.pickup_location_id ? <SheetRow icon={MapPin} main={current.pickup_location} sub="Punto de encuentro" /> : null}
          <SheetRow icon={Flag} main={current.destination} sub="Destino" />
          {current.notes ? <SheetRow icon={StickyNote} main={current.notes} /> : null}
        </SheetRows>
        {current.pickup_location_id ? <LocationCard locationId={current.pickup_location_id} /> : null}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">{current.passengers.length ? `${current.passengers.length} pasajeros` : "Pasajeros"}</h3>
            {canEdit ? <button type="button" onClick={() => setPassengersOpen(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-primary"><Users className="h-3.5 w-3.5" /> Asignar</button> : null}
          </div>
          {current.passengers.length ? (
            <ul className="divide-y divide-border/40 overflow-hidden rounded-[16px] bg-card">
              {current.passengers.map((p) => <li key={p.id} className="flex items-center gap-3 px-3 py-2.5"><PersonAvatar p={p.profile as MiniProfile | null} /><span className="truncate text-sm">{personLabel(p.profile as MiniProfile | null)}</span></li>)}
            </ul>
          ) : <p className="text-sm text-muted-foreground">Sin pasajeros asignados: aplica a todos los viajeros.</p>}
        </section>
      </TripSheet>

      {canEdit ? (
        <TransportFormDialog open={editOpen} onOpenChange={setEditOpen} tripId={tripId} clubId={clubId} userId={userId} transport={current} defaultLeg={current.leg} />
      ) : null}

      {canEdit && passengersOpen ? (
        <PassengerAssignDialog
          open
          onOpenChange={(v) => !v && setPassengersOpen(false)}
          title={`Pasajeros · ${current.label ?? TRANSPORT_TYPE_LABEL[current.transport_type]}`}
          candidates={travelers}
          selectedIds={current.passengers.map((p) => p.user_id)}
          importSources={importSources}
          assignedElsewhere={assignedElsewhere}
          saving={setPassengers.isPending}
          onSave={(ids) =>
            setPassengers.mutate(
              { transportId: current.id, current: current.passengers.map((p) => p.user_id), next: ids },
              {
                onSuccess: () => {
                  toast.success("Pasajeros actualizados");
                  setPassengersOpen(false);
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
