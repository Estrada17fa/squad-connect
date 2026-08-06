import * as React from "react";
import { Luggage, Package, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { personLabel, type MiniProfile } from "@/lib/tripLogistics";
import { categoryIcon } from "@/lib/inventory";
import { formatDateTime } from "@/lib/calendar-utils";
import type { TripLuggage } from "@/hooks/useTripLuggage";
import { materialOutstanding, type TripMaterialLoan } from "@/hooks/useTripMaterial";
import { TimelineSection } from "./TimelineSection";
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
  const [freeOpen, setFreeOpen] = React.useState(false);
  const [editingFree, setEditingFree] = React.useState<TripLuggage | null>(null);
  const [matOpen, setMatOpen] = React.useState(false);
  const [editingLoan, setEditingLoan] = React.useState<TripMaterialLoan | null>(null);
  const [returnOpen, setReturnOpen] = React.useState(false);

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
            <article key={l.id} className="glass flex items-start gap-3 p-3">
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
                  {pending === 0
                    ? "Devuelto por completo"
                    : `Pendientes de devolver: ${pending}${
                        l.expected_return_at ? ` · antes del ${formatDateTime(l.expected_return_at)}` : ""
                      }`}
                </p>
                {l.notes ? <p className="text-xs text-muted-foreground">{l.notes}</p> : null}
              </div>
              {canEdit ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setEditingLoan(l);
                    setMatOpen(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              ) : null}
            </article>
          );
        })}

        {items.map((it) => (
          <article key={it.id} className="glass flex items-start gap-2 p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                {it.description}
                {it.quantity ? <span className="text-muted-foreground"> ×{it.quantity}</span> : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {it.responsible_user_id ? `Lleva: ${personLabel(it.responsible)}` : "Sin responsable"}
              </p>
              {it.notes ? <p className="text-xs text-muted-foreground">{it.notes}</p> : null}
            </div>
            {canEdit ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => {
                  setEditingFree(it);
                  setFreeOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            ) : null}
          </article>
        ))}

        {canEdit ? (
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setEditingLoan(null);
                setMatOpen(true);
              }}
            >
              <Package className="mr-1.5 h-4 w-4" /> Material de inventario
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setEditingFree(null);
                setFreeOpen(true);
              }}
            >
              <Luggage className="mr-1.5 h-4 w-4" /> Ítem libre
            </Button>
            {pendientes > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => setReturnOpen(true)}
              >
                <RotateCcw className="mr-1.5 h-4 w-4" /> Devolver material del viaje ({pendientes})
              </Button>
            ) : null}
          </div>
        ) : null}
      </TimelineSection>

      {canEdit ? (
        <>
          <LuggageFormDialog
            open={freeOpen}
            onOpenChange={setFreeOpen}
            tripId={tripId}
            userId={userId}
            item={editingFree}
            travelers={travelers}
          />
          <TripMaterialDialog
            open={matOpen}
            onOpenChange={setMatOpen}
            tripId={tripId}
            clubId={clubId}
            teamId={teamId}
            userId={userId}
            defaultReturnAt={defaultReturnAt}
            loan={editingLoan}
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
