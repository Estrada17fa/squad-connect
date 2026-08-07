import * as React from "react";
import { Luggage, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { DetailSection } from "@/components/squad/DetailSheet";
import { personLabel, type MiniProfile } from "@/lib/tripLogistics";
import type { TripLuggage } from "@/hooks/useTripLuggage";
import { LuggageFormDialog } from "./LuggageFormDialog";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: TripLuggage | null;
  tripId: string;
  userId: string;
  travelers: { user_id: string; profile: MiniProfile | null }[];
  canEdit: boolean;
}

/** Ficha de lectura de un ítem libre de equipaje/material del viaje. */
export function LuggageItemDetailSheet({ open, onOpenChange, item, tripId, userId, travelers, canEdit }: Props) {
  const [editOpen, setEditOpen] = React.useState(false);

  if (!item) {
    return <EntitySheet open={open} onOpenChange={onOpenChange}><EntitySheetHeader><EntitySheetTitle>Ítem</EntitySheetTitle></EntitySheetHeader><EntitySheetBody /></EntitySheet>;
  }

  return (
    <>
      <EntitySheet open={open} onOpenChange={onOpenChange} size="md">
        <EntitySheetHeader>
          <EntitySheetTitle className="flex items-center gap-2">
            <Luggage className="h-4 w-4 text-primary" /> {item.description}
            {item.quantity ? <span className="text-muted-foreground"> ×{item.quantity}</span> : null}
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
          <DetailSection title="Responsable">
            <p className="text-sm text-muted-foreground">
              {item.responsible_user_id ? personLabel(item.responsible) : "Sin responsable"}
            </p>
          </DetailSection>
          {item.notes ? (
            <DetailSection title="Notas">
              <p className="text-sm text-muted-foreground">{item.notes}</p>
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
        <LuggageFormDialog open={editOpen} onOpenChange={setEditOpen} tripId={tripId} userId={userId} item={item} travelers={travelers} />
      ) : null}
    </>
  );
}
