import * as React from "react";
import { Luggage, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { personLabel, type MiniProfile } from "@/lib/tripLogistics";
import type { TripLuggage } from "@/hooks/useTripLuggage";
import { TimelineSection } from "./TimelineSection";
import { LuggageFormDialog } from "./LuggageFormDialog";

interface Props {
  tripId: string;
  userId: string;
  items: TripLuggage[];
  travelers: { user_id: string; profile: MiniProfile | null }[];
  canEdit: boolean;
}

export function LuggageSection({ tripId, userId, items, travelers, canEdit }: Props) {
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TripLuggage | null>(null);

  return (
    <>
      <TimelineSection
        icon={Luggage}
        title="Equipaje y material"
        count={items.length}
        canEdit={canEdit}
        addLabel="Agregar equipaje"
        emptyLabel="Sin material registrado."
        onAdd={() => {
          setEditing(null);
          setOpen(true);
        }}
      >
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
                  setEditing(it);
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
        <LuggageFormDialog
          open={open}
          onOpenChange={setOpen}
          tripId={tripId}
          userId={userId}
          item={editing}
          travelers={travelers}
        />
      ) : null}
    </>
  );
}
