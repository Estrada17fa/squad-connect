import * as React from "react";
import { Pencil, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { DetailSection } from "@/components/squad/DetailSheet";
import { formatDateTime } from "@/lib/calendar-utils";
import { MEAL_TYPE_LABEL } from "@/lib/tripLogistics";
import type { TripMeal } from "@/hooks/useTripMeals";
import { MealFormDialog } from "./MealFormDialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  meal: TripMeal | null;
  tripId: string;
  userId: string;
  canEdit: boolean;
}

/** Ficha de lectura de una comida programada del viaje. */
export function MealDetailSheet({ open, onOpenChange, meal, tripId, userId, canEdit }: Props) {
  const [editOpen, setEditOpen] = React.useState(false);

  if (!meal) {
    return <EntitySheet open={open} onOpenChange={onOpenChange}><EntitySheetHeader><EntitySheetTitle>Comida</EntitySheetTitle></EntitySheetHeader><EntitySheetBody /></EntitySheet>;
  }

  return (
    <>
      <EntitySheet open={open} onOpenChange={onOpenChange} size="md">
        <EntitySheetHeader>
          <EntitySheetTitle className="flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-primary" /> {MEAL_TYPE_LABEL[meal.meal_type]}
          </EntitySheetTitle>
          <EntitySheetDescription>{formatDateTime(meal.scheduled_at)}</EntitySheetDescription>
          <div className="mt-3 flex flex-wrap gap-2">
            {canEdit ? (
              <Button size="sm" variant="secondary" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-3.5 w-3.5" /> Editar
              </Button>
            ) : null}
          </div>
        </EntitySheetHeader>

        <EntitySheetBody>
          {meal.location ? (
            <DetailSection title="Lugar">
              <p className="text-sm text-muted-foreground">{meal.location}</p>
            </DetailSection>
          ) : null}
          {meal.notes ? (
            <DetailSection title="Notas">
              <p className="text-sm text-muted-foreground">{meal.notes}</p>
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
        <MealFormDialog open={editOpen} onOpenChange={setEditOpen} tripId={tripId} userId={userId} meal={meal} />
      ) : null}
    </>
  );
}
