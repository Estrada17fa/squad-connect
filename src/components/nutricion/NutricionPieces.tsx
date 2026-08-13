import * as React from "react";
import {
  Apple,
  Coffee,
  CookingPot,
  Minus,
  Moon,
  Plus,
  Salad,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FOOD_GROUP_LABEL,
  FOOD_GROUP_ORDER,
  MEAL_SLOT_LABEL,
  PORTION_MAX,
  PORTION_MIN,
  PORTION_STEP,
  clampPortions,
  portionsChipLabel,
  portionsNumber,
  type FoodGroup,
  type MealSlot,
} from "@/lib/nutricion";
import { cn } from "@/lib/utils";

/** Icono propio por tiempo de comida (sin emojis). */
export const MEAL_SLOT_ICON: Record<MealSlot, React.ComponentType<{ className?: string }>> = {
  desayuno: Coffee,
  colacion_1: Apple,
  comida: UtensilsCrossed,
  colacion_2: Salad,
  cena: Moon,
};

/* --------------------------------- Chips --------------------------------- */

export function PortionChip({
  group,
  portions,
  onClick,
}: {
  group: FoodGroup;
  portions: number;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="font-semibold text-foreground">{portionsNumber(portions)} porc.</span>
      <span className="text-muted-foreground">{FOOD_GROUP_LABEL[group]}</span>
    </>
  );
  const className =
    "inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1 text-xs ring-1 ring-inset ring-white/10";
  if (!onClick) return <span className={className}>{content}</span>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Ver equivalencias de ${portionsChipLabel(portions, group)}`}
      className={cn(className, "transition-colors hover:bg-white/10 hover:ring-white/20")}
    >
      {content}
    </button>
  );
}

/* ---------------------- Campo de porciones (formulario) ------------------- */

export function PortionField({
  group,
  portions,
  onGroupChange,
  onPortionsChange,
  onRemove,
}: {
  group: FoodGroup;
  portions: number;
  onGroupChange: (g: FoodGroup) => void;
  onPortionsChange: (n: number) => void;
  onRemove: () => void;
}) {
  const id = React.useId();
  return (
    <div className="rounded-lg bg-white/[0.03] p-2.5 ring-1 ring-inset ring-white/5">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor={id} className="text-xs text-muted-foreground">
            Grupo de alimentos
          </Label>
          <Select value={group} onValueChange={(v) => onGroupChange(v as FoodGroup)}>
            <SelectTrigger id={id}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FOOD_GROUP_ORDER.map((g) => (
                <SelectItem key={g} value={g}>
                  {FOOD_GROUP_LABEL[g]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mt-6 shrink-0"
          aria-label="Quitar grupo"
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-2 space-y-1.5">
        <Label className="text-xs text-muted-foreground">Porciones (de media en media)</Label>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Quitar media porción"
            disabled={portions <= PORTION_MIN}
            onClick={() => onPortionsChange(clampPortions(portions - PORTION_STEP))}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <div className="relative flex-1">
            <Input
              type="number"
              inputMode="decimal"
              min={PORTION_MIN}
              max={PORTION_MAX}
              step={PORTION_STEP}
              value={portions}
              onChange={(e) => onPortionsChange(clampPortions(Number(e.target.value)))}
              className="pr-16 text-center"
              aria-label={`Porciones de ${FOOD_GROUP_LABEL[group]}`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              porc.
            </span>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Agregar media porción"
            disabled={portions >= PORTION_MAX}
            onClick={() => onPortionsChange(clampPortions(portions + PORTION_STEP))}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {portionsNumber(portions)} {portions === 1 ? "porción" : "porciones"} de{" "}
          {FOOD_GROUP_LABEL[group].toLowerCase()}
        </p>
      </div>
    </div>
  );
}

/* ------------------------- Tarjeta de tiempo de comida -------------------- */

export interface MealCardRecipe {
  id: string;
  name: string;
}

export function MealCard({
  slot,
  portions,
  recipes,
  notes,
  onGroupClick,
  onRecipeClick,
  actions,
}: {
  slot: MealSlot;
  portions: { id: string; food_group: FoodGroup; portions: number }[];
  recipes?: MealCardRecipe[];
  notes?: string | null;
  onGroupClick?: (g: FoodGroup) => void;
  onRecipeClick?: (id: string) => void;
  actions?: React.ReactNode;
}) {
  const Icon = MEAL_SLOT_ICON[slot];
  return (
    <div className="glass space-y-3 rounded-lg p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <p className="font-display text-sm font-semibold">{MEAL_SLOT_LABEL[slot]}</p>
        </div>
        {actions}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {portions.length === 0 ? (
          <span className="text-xs text-muted-foreground">Sin porciones asignadas</span>
        ) : (
          portions.map((p) => (
            <PortionChip
              key={p.id}
              group={p.food_group}
              portions={Number(p.portions)}
              onClick={onGroupClick ? () => onGroupClick(p.food_group) : undefined}
            />
          ))
        )}
      </div>

      {recipes && recipes.length > 0 ? (
        <div className="space-y-1.5 border-t border-white/5 pt-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <CookingPot className="h-3.5 w-3.5" /> Recetas sugeridas
          </p>
          <div className="flex flex-wrap gap-1.5">
            {recipes.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={onRecipeClick ? () => onRecipeClick(r.id) : undefined}
                disabled={!onRecipeClick}
                className={cn(
                  "rounded-md bg-white/[0.04] px-2.5 py-1 text-left text-xs text-foreground ring-1 ring-inset ring-white/10",
                  onRecipeClick && "transition-colors hover:bg-white/10",
                )}
              >
                {r.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {notes ? (
        <p className="whitespace-pre-wrap border-t border-white/5 pt-2 text-xs text-muted-foreground">
          {notes}
        </p>
      ) : null}
    </div>
  );
}
