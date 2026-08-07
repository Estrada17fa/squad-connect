import * as React from "react";
import { Package, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { DetailField, DetailGrid, DetailSection } from "@/components/squad/DetailSheet";
import { categoryIcon } from "@/lib/inventory";
import { formatDateTime } from "@/lib/calendar-utils";
import { personLabel, type MiniProfile } from "@/lib/tripLogistics";
import { materialOutstanding, type TripMaterialLoan } from "@/hooks/useTripMaterial";
import { TripMaterialDialog } from "./TripMaterialDialog";

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

  if (!loan) {
    return <EntitySheet open={open} onOpenChange={onOpenChange}><EntitySheetHeader><EntitySheetTitle>Material</EntitySheetTitle></EntitySheetHeader><EntitySheetBody /></EntitySheet>;
  }

  const Icon = categoryIcon(loan.item?.category);
  const pending = materialOutstanding(loan);

  return (
    <>
      <EntitySheet open={open} onOpenChange={onOpenChange} size="md">
        <EntitySheetHeader>
          <EntitySheetTitle className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-primary" /> {loan.item?.name ?? "Material"}
            <span className="text-muted-foreground"> ×{loan.quantity}</span>
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
          <DetailSection>
            <DetailGrid>
              <DetailField label="Lleva">{personLabel(loan.borrower)}</DetailField>
              <DetailField label="Pendiente">{pending === 0 ? "Devuelto por completo" : `${pending}`}</DetailField>
              <DetailField label="Devolución esperada">
                {loan.expected_return_at ? formatDateTime(loan.expected_return_at) : "—"}
              </DetailField>
              <DetailField label="Devolución real">
                {loan.returned_at ? formatDateTime(loan.returned_at) : "Pendiente"}
              </DetailField>
            </DetailGrid>
          </DetailSection>

          {loan.notes ? (
            <DetailSection title="Notas">
              <p className="text-sm text-muted-foreground">{loan.notes}</p>
            </DetailSection>
          ) : null}
        </EntitySheetBody>

        <EntitySheetFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </EntitySheetFooter>
      </EntitySheet>

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
