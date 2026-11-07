import * as React from "react";
import { CalendarClock, StickyNote, User, Package } from "lucide-react";
import { toast } from "sonner";
import { DetailHero, MoreMenu, TripSheet } from "@/components/coord/viajes/form";
import { SheetRow, SheetRows } from "@/components/agenda/EventSheet";
import { categoryIcon } from "@/lib/inventory";
import { formatDateTime } from "@/lib/calendar-utils";
import { personLabel, type MiniProfile } from "@/lib/tripLogistics";
import { materialOutstanding, type TripMaterialLoan } from "@/hooks/useTripMaterial";
import { TripMaterialDialog } from "./TripMaterialDialog";
import { useTripMaterialMutations } from "@/hooks/useTripMaterial";
import { useTripRefresh } from "@/hooks/useTripChannel";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  loan: TripMaterialLoan | null;
  tripId: string;
  clubId: string;
  teamId: string | null;
  userId: string;
  defaultReturnAt: string | null;
  travelers: { user_id: string; profile: MiniProfile | null }[];
  canEdit: boolean;
}

/** Ficha de lectura de un préstamo de material del inventario ligado al viaje. */
export function MaterialLoanDetailSheet({
  open,
  onOpenChange,
  loan,
  tripId,
  clubId,
  teamId,
  userId,
  defaultReturnAt,
  travelers,
  canEdit,
}: Props) {
  const [editOpen, setEditOpen] = React.useState(false);
  const { remove } = useTripMaterialMutations(tripId, clubId);
  const refresh = useTripRefresh(tripId);

  if (!loan) return null;

  const Icon = categoryIcon(loan.item?.category);
  const pending = materialOutstanding(loan);

  return (
    <>
      <TripSheet open={open} onOpenChange={onOpenChange} title="Material"
        menu={canEdit ? <MoreMenu onEdit={() => setEditOpen(true)} deleteLabel="Quitar del viaje" confirmTitle="¿Quitar este material del viaje?" confirmDescription="Se elimina el préstamo y el material vuelve a estar disponible." deleting={remove.isPending}
          onDelete={() => remove.mutateAsync(loan.id).then(() => { toast.success("Material eliminado del viaje"); refresh(); onOpenChange(false); }).catch((e: any) => toast.error(e.message ?? "No se pudo quitar"))} /> : null}>
        <DetailHero icon={Icon} title={`${loan.item?.name ?? "Material"} ×${loan.quantity}`} sub={pending === 0 ? "Devuelto por completo" : `${pending} pendiente${pending === 1 ? "" : "s"} de devolver`} />
        <SheetRows>
          <SheetRow icon={User} main={personLabel(loan.borrower)} sub="Lo lleva" />
          <SheetRow icon={CalendarClock} main={loan.expected_return_at ? formatDateTime(loan.expected_return_at) : "Sin fecha"} sub={loan.returned_at ? `Devuelto ${formatDateTime(loan.returned_at)}` : "Devolución esperada"} />
          {loan.notes ? <SheetRow icon={StickyNote} main={loan.notes} /> : null}
        </SheetRows>
      </TripSheet>

      {canEdit ? (
        <TripMaterialDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          tripId={tripId}
          clubId={clubId}
          teamId={teamId}
          userId={userId}
          defaultReturnAt={defaultReturnAt}
          loan={loan}
          travelers={travelers}
        />
      ) : null}
    </>
  );
}
