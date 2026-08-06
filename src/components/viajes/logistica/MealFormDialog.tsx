import * as React from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import {
  EntitySheet,
  EntitySheetBody,
  EntitySheetDescription,
  EntitySheetFooter,
  EntitySheetHeader,
  EntitySheetTitle,
} from "@/components/squad/EntitySheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toLocalInputValue, fromLocalInputValue } from "@/lib/calendar-utils";
import { MEAL_TYPE_LABEL, MEAL_TYPE_ORDER, type TripMealType } from "@/lib/tripLogistics";
import { useMealMutations, type MealInput, type TripMeal } from "@/hooks/useTripMeals";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tripId: string;
  userId: string;
  meal?: TripMeal | null;
}

export function MealFormDialog({ open, onOpenChange, tripId, userId, meal }: Props) {
  const isEdit = !!meal;
  const { save, remove } = useMealMutations(tripId);

  const [type, setType] = React.useState<TripMealType>("comida");
  const [scheduledAt, setScheduledAt] = React.useState("");
  const [location, setLocation] = React.useState("");
  const [notes, setNotes] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setType(meal?.meal_type ?? "comida");
    setScheduledAt(meal?.scheduled_at ? toLocalInputValue(meal.scheduled_at) : "");
    setLocation(meal?.location ?? "");
    setNotes(meal?.notes ?? "");
  }, [open, meal]);

  const submit = () => {
    if (!scheduledAt) return toast.error("La fecha y hora son obligatorias");
    const input: MealInput = {
      meal_type: type,
      scheduled_at: fromLocalInputValue(scheduledAt),
      location: location.trim() || null,
      notes: notes.trim() || null,
    };
    save.mutate(
      { id: meal?.id, input, userId },
      {
        onSuccess: () => {
          toast.success(isEdit ? "Comida actualizada" : "Comida agregada");
          onOpenChange(false);
        },
        onError: (e: any) => toast.error(e.message ?? "No se pudo guardar la comida"),
      },
    );
  };

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="md">
      <EntitySheetHeader>
        <EntitySheetTitle>{isEdit ? "Editar comida" : "Nueva comida"}</EntitySheetTitle>
        <EntitySheetDescription>Alimentación programada durante el viaje.</EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody>
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={type} onValueChange={(v) => setType(v as TripMealType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MEAL_TYPE_ORDER.map((t) => (
                <SelectItem key={t} value={t}>
                  {MEAL_TYPE_LABEL[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="m-at">Fecha y hora *</Label>
          <Input
            id="m-at"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="m-loc">Lugar</Label>
          <Input id="m-loc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Restaurante del hotel" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="m-notes">Notas</Label>
          <Textarea id="m-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {isEdit ? (
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() =>
              meal &&
              remove.mutate(meal.id, {
                onSuccess: () => {
                  toast.success("Comida eliminada");
                  onOpenChange(false);
                },
                onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
              })
            }
          >
            <Trash2 className="mr-2 h-4 w-4" /> Eliminar comida
          </Button>
        ) : null}
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button type="button" className="glow-primary" disabled={save.isPending} onClick={submit}>
          {isEdit ? "Guardar cambios" : "Agregar comida"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
