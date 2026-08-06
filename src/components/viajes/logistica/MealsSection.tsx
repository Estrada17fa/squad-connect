import * as React from "react";
import { Pencil, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/calendar-utils";
import { MEAL_TYPE_LABEL } from "@/lib/tripLogistics";
import type { TripMeal } from "@/hooks/useTripMeals";
import { TimelineSection } from "./TimelineSection";
import { MealFormDialog } from "./MealFormDialog";

interface Props {
  tripId: string;
  userId: string;
  meals: TripMeal[];
  canEdit: boolean;
}

export function MealsSection({ tripId, userId, meals, canEdit }: Props) {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TripMeal | null>(null);

  return (
    <>
      <TimelineSection
        icon={UtensilsCrossed}
        title="Comidas"
        count={meals.length}
        canEdit={canEdit}
        addLabel="Agregar comida"
        emptyLabel="Sin comidas programadas."
        onAdd={() => {
          setEditing(null);
          setOpen(true);
        }}
      >
        {meals.map((m) => (
          <article key={m.id} className="glass flex items-start gap-2 p-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{MEAL_TYPE_LABEL[m.meal_type]}</p>
              <p className="text-xs text-muted-foreground">{formatDateTime(m.scheduled_at)}</p>
              {m.location ? <p className="text-xs text-muted-foreground">{m.location}</p> : null}
              {m.notes ? <p className="text-xs text-muted-foreground">{m.notes}</p> : null}
            </div>
            {canEdit ? (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => {
                  setEditing(m);
                  setOpen(true);
                }}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            ) : null}
          </article>
        ))}
      </TimelineSection>

      {canEdit ? (
        <MealFormDialog open={open} onOpenChange={setOpen} tripId={tripId} userId={userId} meal={editing} />
      ) : null}
    </>
  );
}
