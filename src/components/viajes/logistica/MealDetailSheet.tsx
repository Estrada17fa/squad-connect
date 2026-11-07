import * as React from "react";
import { MapPin, StickyNote, UtensilsCrossed } from "lucide-react";
import { toast } from "sonner";
import { DetailHero, MoreMenu, TripSheet } from "@/components/coord/viajes/form";
import { SheetRow, SheetRows } from "@/components/agenda/EventSheet";
import { formatDateTime } from "@/lib/calendar-utils";
import { MEAL_TYPE_LABEL } from "@/lib/tripLogistics";
import type { TripMeal } from "@/hooks/useTripMeals";
import { MealFormDialog } from "./MealFormDialog";
import { useMealMutations } from "@/hooks/useTripMeals";
import { useTripRefresh } from "@/hooks/useTripChannel";

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
  const { remove } = useMealMutations(tripId);
  const refresh = useTripRefresh(tripId);

  if (!meal) return null;

  return (
    <>
      <TripSheet open={open} onOpenChange={onOpenChange} title="Comida"
        menu={canEdit ? <MoreMenu onEdit={() => setEditOpen(true)} deleteLabel="Eliminar comida" deleting={remove.isPending}
          onDelete={() => remove.mutateAsync(meal.id).then(() => { toast.success("Comida eliminada"); refresh(); onOpenChange(false); }).catch((e: any) => toast.error(e.message ?? "No se pudo eliminar"))} /> : null}>
        <DetailHero icon={UtensilsCrossed} title={MEAL_TYPE_LABEL[meal.meal_type]} sub={formatDateTime(meal.scheduled_at)} />
        {meal.location || meal.notes ? (
          <SheetRows>
            {meal.location ? <SheetRow icon={MapPin} main={meal.location} sub="Lugar" /> : null}
            {meal.notes ? <SheetRow icon={StickyNote} main={meal.notes} /> : null}
          </SheetRows>
        ) : null}
      </TripSheet>

      {canEdit ? (
        <MealFormDialog open={editOpen} onOpenChange={setEditOpen} tripId={tripId} userId={userId} meal={meal} />
      ) : null}
    </>
  );
}
