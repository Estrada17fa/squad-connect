import * as React from "react";
import { toast } from "sonner";
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
import { FOOD_GROUP_LABEL, FOOD_GROUP_ORDER, type FoodGroup } from "@/lib/nutricion";
import { useSaveRecipe, type RecipeRow } from "@/hooks/useNutrition";
import { cn } from "@/lib/utils";

export function RecipeFormDialog({
  open,
  onOpenChange,
  clubId,
  userId,
  recipe,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  clubId: string;
  userId: string;
  recipe?: RecipeRow | null;
  onSaved?: (r: RecipeRow) => void;
}) {
  const save = useSaveRecipe(clubId, userId);
  const [name, setName] = React.useState("");
  const [groups, setGroups] = React.useState<FoodGroup[]>([]);
  const [ingredients, setIngredients] = React.useState("");
  const [preparation, setPreparation] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setName(recipe?.name ?? "");
    setGroups(recipe?.food_groups ?? []);
    setIngredients(recipe?.ingredients ?? "");
    setPreparation(recipe?.preparation ?? "");
  }, [open, recipe]);

  const toggle = (g: FoodGroup) =>
    setGroups((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));

  const submit = async () => {
    try {
      const saved = await save.mutateAsync({
        id: recipe?.id ?? null,
        name: name.trim(),
        food_groups: groups,
        ingredients: ingredients.trim() || null,
        preparation: preparation.trim() || null,
      });
      toast.success(recipe ? "Receta actualizada" : "Receta guardada");
      onOpenChange(false);
      onSaved?.(saved);
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar la receta");
    }
  };

  return (
    <EntitySheet open={open} onOpenChange={onOpenChange} size="md">
      <EntitySheetHeader>
        <EntitySheetTitle>{recipe ? "Editar receta" : "Nueva receta"}</EntitySheetTitle>
        <EntitySheetDescription>
          Se guarda en la biblioteca del club y se reutiliza en cualquier plan.
        </EntitySheetDescription>
      </EntitySheetHeader>

      <EntitySheetBody className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="rc-name">Nombre</Label>
          <Input
            id="rc-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Omelette de claras con espinaca"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Grupos de alimentos</Label>
          <div className="flex flex-wrap gap-1.5">
            {FOOD_GROUP_ORDER.map((g) => {
              const on = groups.includes(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggle(g)}
                  aria-pressed={on}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs ring-1 ring-inset transition-colors",
                    on
                      ? "bg-primary/15 text-primary ring-primary/30"
                      : "bg-white/[0.04] text-muted-foreground ring-white/10 hover:bg-white/10",
                  )}
                >
                  {FOOD_GROUP_LABEL[g]}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rc-ing">Ingredientes</Label>
          <Textarea
            id="rc-ing"
            rows={3}
            value={ingredients}
            onChange={(e) => setIngredients(e.target.value)}
            placeholder="3 claras, 1 taza de espinaca, 1 cdita de aceite…"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rc-prep">Preparación</Label>
          <Textarea
            id="rc-prep"
            rows={3}
            value={preparation}
            onChange={(e) => setPreparation(e.target.value)}
            placeholder="Saltear la espinaca, agregar las claras y cocinar a fuego bajo."
          />
        </div>
      </EntitySheetBody>

      <EntitySheetFooter>
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button className="glow-primary" disabled={!name.trim() || save.isPending} onClick={submit}>
          {save.isPending ? "Guardando…" : "Guardar receta"}
        </Button>
      </EntitySheetFooter>
    </EntitySheet>
  );
}
