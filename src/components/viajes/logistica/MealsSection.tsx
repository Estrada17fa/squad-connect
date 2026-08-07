import * as React from "react";
import { UtensilsCrossed } from "lucide-react";
import { formatDateTime } from "@/lib/calendar-utils";
import { MEAL_TYPE_LABEL } from "@/lib/tripLogistics";
import type { TripMeal } from "@/hooks/useTripMeals";
import { TimelineSection } from "./TimelineSection";
import { MealFormDialog } from "./MealFormDialog";
import { MealDetailSheet } from "./MealDetailSheet";

interface Props {
  tripId: string;
  userId: string;
  meals: TripMeal[];
  canEdit: boolean;
}

export function MealsSection({ tripId, userId, meals, canEdit }: Props) {
  const [formOpen, setFormOpen] = React.useState(false);
  const [detailFor, setDetailFor] = React.useState<TripMeal | null>(null);

  return (
    <>
      <TimelineSection
        icon={UtensilsCrossed}
        title="Comidas"
        count={meals.length}
        canEdit={canEdit}
        addLabel="Agregar comida"
        emptyLabel="Sin comidas programadas."
        onAdd={() => setFormOpen(true)}
      >
        {meals.map((m) => (
          <button
            key={m.id}
            type="button"
            className="glass flex w-full items-start gap-2 p-3 text-left transition-colors hover:bg-white/[0.04]"
            onClick={() => setDetailFor(m)}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{MEAL_TYPE_LABEL[m.meal_type]}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(m.scheduled_at)}</p>
              {m.location ? <p className="text-xs text-muted-foreground">{m.location}</p> : null}
            </div>
          </button>
        ))}
      </TimelineSection>

      {canEdit ? <MealFormDialog open={formOpen} onOpenChange={setFormOpen} tripId={tripId} userId={userId} meal={null} /> : null}

      <MealDetailSheet
        open={!!detailFor}
        onOpenChange={(v) => !v && setDetailFor(null)}
        meal={detailFor}
        tripId={tripId}
        userId={userId}
        canEdit={canEdit}
      />
    </>
  );
}
