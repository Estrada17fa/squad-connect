import * as React from "react";
import { Luggage, Package, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { personLabel, type MiniProfile } from "@/lib/tripLogistics";
import { categoryIcon } from "@/lib/inventory";
import type { TripLuggage } from "@/hooks/useTripLuggage";
import { materialOutstanding, type TripMaterialLoan } from "@/hooks/useTripMaterial";
import { TimelineSection } from "./TimelineSection";
import { LuggageItemDetailSheet } from "./LuggageItemDetailSheet";
import { MaterialLoanDetailSheet } from "./MaterialLoanDetailSheet";
import { LuggageFormDialog } from "./LuggageFormDialog";
import { TripMaterialDialog } from "./TripMaterialDialog";
import { TripMaterialReturnDialog } from "./TripMaterialReturnDialog";

interface Props {
  tripId: string;
  clubId: string;
  teamId: string | null;
  userId: string;
  defaultReturnAt: string | null;
  /** Ítems libres (texto), para cosas que no salen del inventario. */
  items: TripLuggage[];
  /** Material del inventario, como préstamos ligados al viaje. */
  loans: TripMaterialLoan[];
  travelers: { user_id: string; profile: MiniProfile | null }[];
  canEdit: boolean;
}

/**
 * Equipaje y material del viaje: mezcla el material del inventario
 * (préstamo real, la disponibilidad baja sola) con ítems libres de texto.
 * El clic en un ítem abre su ficha de lectura; editar es una acción
 * deliberada disponible solo para quien puede editar el viaje.
 */
export function LuggageSection({
  tripId,
  clubId,
  teamId,
  userId,
  defaultReturnAt,
  items,
  loans,
  travelers,
  canEdit,
}: Props) {
  const [freeFormOpen, setFreeFormOpen] = React.useState(false);
  const [matFormOpen, setMatFormOpen] = React.useState(false);
  const [returnOpen, setReturnOpen] = React.useState(false);
  const [detailItem, setDetailItem] = React.useState<TripLuggage | null>(null);
  const [detailLoan, setDetailLoan] = React.useState<TripMaterialLoan | null>(null);

  const pendientes = loans.reduce((acc, l) => acc + materialOutstanding(l), 0);

  return (
    <>
      <TimelineSection
        icon={Luggage}
        title="Equipaje y material"
        count={items.length + loans.length}
        emptyLabel="Sin material registrado."
      >
        {loans.map((l) => {
          const Icon = categoryIcon(l.item?.category);
          const pending = materialOutstanding(l);
          return (
            <button
              key={l.id}
              type="button"
              className="glass flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-white/[0.04]"
              onClick={() => setDetailLoan(l)}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {l.item?.name ?? "Material"}
                  <span className="text-muted-foreground"> ×{l.quantity}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Del inventario · Lleva: {personLabel(l.borrower)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {pending === 0 ? "Devuelto por completo" : `Pendientes de devolver: ${pending}`}
                </p>
              </div>
            </button>
          );
        })}

        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            className="glass flex w-full items-start gap-2 p-3 text-left transition-colors hover:bg-white/[0.04]"
            onClick={() => setDetailItem(it)}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                {it.description}
                {it.quantity ? <span className="text-muted-foreground"> ×{it.quantity}</span> : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {it.responsible_user_id ? `Lleva: ${personLabel(it.responsible)}` : "Sin responsable"}
              </p>
            </div>
          </button>
        ))}

        {canEdit ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => setMatFormOpen(true)}>
              <Package className="mr-1.5 h-4 w-4" /> Material de inventario
            </Button>
            <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => setFreeFormOpen(true)}>
              <Luggage className="mr-1.5 h-4 w-4" /> Ítem libre
            </Button>
            {pendientes > 0 ? (
              <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => setReturnOpen(true)}>
                <RotateCcw className="mr-1.5 h-4 w-4" /> Devolver material del viaje ({pendientes})
              </Button>
            ) : null}
          </div>
        ) : null}
      </TimelineSection>

      <LuggageItemDetailSheet
        open={!!detailItem}
        onOpenChange={(v) => !v && setDetailItem(null)}
        item={detailItem}
        tripId={tripId}
        userId={userId}
        travelers={travelers}
        canEdit={canEdit}
      />

      <MaterialLoanDetailSheet
        open={!!detailLoan}
        onOpenChange={(v) => !v && setDetailLoan(null)}
        loan={detailLoan}
        tripId={tripId}
        clubId={clubId}
        teamId={teamId}
        userId={userId}
        defaultReturnAt={defaultReturnAt}
        travelers={travelers}
        canEdit={canEdit}
      />

      {canEdit ? (
        <>
          <LuggageFormDialog
            open={freeFormOpen}
            onOpenChange={setFreeFormOpen}
            tripId={tripId}
            userId={userId}
            item={null}
            travelers={travelers}
          />
          <TripMaterialDialog
            open={matFormOpen}
            onOpenChange={setMatFormOpen}
            tripId={tripId}
            clubId={clubId}
            teamId={teamId}
            userId={userId}
            defaultReturnAt={defaultReturnAt}
            loan={null}
            travelers={travelers}
          />
          <TripMaterialReturnDialog
            open={returnOpen}
            onOpenChange={setReturnOpen}
            tripId={tripId}
            clubId={clubId}
            loans={loans}
          />
        </>
      ) : null}
    </>
  );
}
