import * as React from "react";
import { toast } from "sonner";
import { toLocalInputValue, fromLocalInputValue } from "@/lib/calendar-utils";
import { MEAL_TYPE_LABEL, MEAL_TYPE_ORDER, type TripMealType } from "@/lib/tripLogistics";
import { DateTimeField, Field, MoreMenu, SegmentedField, TextArea, TextField, TripSheet } from "@/components/coord/viajes/form";
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

  const del = () => meal && remove.mutate(meal.id, {
    onSuccess: () => { toast.success("Comida eliminada"); onOpenChange(false); },
    onError: (e: any) => toast.error(e.message ?? "No se pudo eliminar"),
  });

  return (
    <TripSheet open={open} onOpenChange={onOpenChange} title={isEdit ? "Editar comida" : "Nueva comida"}
      menu={isEdit ? <MoreMenu onDelete={del} deleteLabel="Eliminar comida" deleting={remove.isPending} /> : null}
      primary={{ label: isEdit ? "Guardar cambios" : "Agregar comida", onClick: submit, loading: save.isPending }}>
      <Field label="Tipo"><SegmentedField items={MEAL_TYPE_ORDER.map((t) => ({ key: t, label: MEAL_TYPE_LABEL[t] }))} value={type} onChange={setType} /></Field>
      <Field label="Fecha y hora"><DateTimeField value={scheduledAt} onChange={setScheduledAt} /></Field>
      <Field label="Lugar"><TextField value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Restaurante del hotel" /></Field>
      <Field label="Notas"><TextArea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
    </TripSheet>
  );
}
