import * as React from "react";
import { Package, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { personLabel, type MiniProfile } from "@/lib/tripLogistics";
import { categoryIcon } from "@/lib/inventory";
import { materialOutstanding, type TripMaterialLoan } from "@/hooks/useTripMaterial";
import { TimelineSection } from "./TimelineSection";
import { MaterialLoanDetailSheet } from "./MaterialLoanDetailSheet";
import { TripMaterialDialog } from "./TripMaterialDialog";
import { TripMaterialReturnDialog } from "./TripMaterialReturnDialog";

interface Props {
  tripId: string;
  clubId: string;
  teamId: string | null;
  userId: string;
  defaultReturnAt: string | null;
  /** Material del inventario, como préstamos ligados al viaje. */
  loans: TripMaterialLoan[];
  travelers: { user_id: string; profile: MiniProfile | null }[];
  canEdit: boolean;
}

/**
 * Material del club en el viaje: préstamos reales del inventario
 * (la disponibilidad baja sola). El equipaje personal de cada convocado
 * vive en su propio bloque.
 */
export function LuggageSection({
  tripId,
  clubId,
  teamId,
  userId,
  defaultReturnAt,
  loans,
  travelers,
  canEdit,
}: Props) {
  const [matFormOpen, setMatFormOpen] = React.useState(false);
  const [returnOpen, setReturnOpen] = React.useState(false);
  const [detailLoan, setDetailLoan] = React.useState<TripMaterialLoan | null>(null);

  const pendientes = loans.reduce((acc, l) => acc + materialOutstanding(l), 0);

  return (
    <>
      <TimelineSection
        icon={Package}
        title="Material del club"
        count={loans.length}
        emptyLabel="Sin material del inventario en este viaje."
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

        {canEdit ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button" size="sm" variant="outline" className="flex-1" onClick={() => setMatFormOpen(true)}>
              <Package className="mr-1.5 h-4 w-4" /> Material de inventario
            </Button>
            {pendientes > 0 ? (
              <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => setReturnOpen(true)}>
                <RotateCcw className="mr-1.5 h-4 w-4" /> Devolver material del viaje ({pendientes})
              </Button>
            ) : null}
          </div>
        ) : null}
      </TimelineSection>

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
